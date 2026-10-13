import type { Request, Response } from 'express';
import { checkIdempotency } from '../../services/idempotency.js';
import { hasuraRequest } from '../../services/hasura.js';
import { trustlessWorkRequest } from '../../services/trustlesswork.js';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { getApartmentEscrowTerms, ApartmentTermsError } from '../../services/apartment-escrow-terms.js';
import { getUserWallets } from '../../services/escrow-authz.js';
import { findLiveAction, insertPendingAction } from '../../services/pending-actions.js';
import { transactionExpiry, transactionHash } from '../../lib/stellar-xdr.js';

type DeployRequestBody = {
  apartmentId?: string;
  /** The connected wallet chosen by the guest. It must already belong to them. */
  senderAddress?: string;
};

type DeployResponse = {
  status: string;
  contractId?: string;
  unsignedXDR: string;
  engagementId: string;
  cached?: boolean;
};

export const deployEscrowHandler = asyncHandler(async (
  req: AuthenticatedRequest & Request<Record<string, never>, DeployResponse | { error: string }, DeployRequestBody>,
  res: Response<DeployResponse | { error: string }>,
) => {
  const { apartmentId, senderAddress } = req.body;
  const uid = req.user?.uid;

  if (!apartmentId || !senderAddress) {
    res.status(400).json({
      error: 'Missing required fields: apartmentId, senderAddress',
    });
    return;
  }
  if (!uid) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');
  }

  const callerWallets = await getUserWallets(uid);
  if (!callerWallets.includes(senderAddress)) {
    throw new ApiError(403, 'WALLET_NOT_REGISTERED', 'Connect and register the Stellar wallet that will sign this escrow.');
  }

  let terms;
  try {
    terms = await getApartmentEscrowTerms(apartmentId);
  } catch (error) {
    if (error instanceof ApartmentTermsError) {
      throw new ApiError(error.status, error.code, error.message);
    }
    throw error;
  }
  if (terms.ownerUserId === uid) {
    throw new ApiError(409, 'SELF_ESCROW_NOT_ALLOWED', 'You cannot create a rental escrow for your own apartment.');
  }

  // An apartment can have one active deposit per guest in the MVP. Booking IDs
  // can replace this deterministic key when the booking domain is introduced.
  const resolvedEngagementId = `rental:${apartmentId}:${uid}`;

  // ── Idempotency check ──────────────────────────────────────────────────
  const idempotencyResult = await checkIdempotency(resolvedEngagementId);

  if (idempotencyResult.exists) {
    const pending = await findLiveAction(resolvedEngagementId, 'initialize');
    if (pending?.status === 'built') {
      res.status(200).json({
        status: 'PENDING_SIGNATURE',
        engagementId: resolvedEngagementId,
        contractId: pending.contract_id ?? undefined,
        unsignedXDR: pending.unsigned_xdr,
        cached: true,
      });
      return;
    }
    console.log(
      `[escrow/deploy] idempotent hit — engagementId: ${resolvedEngagementId}, ` +
      `contractId: ${idempotencyResult.result.contract_id}`,
    );
    res.status(200).json({
      status: 'CACHED',
      engagementId: resolvedEngagementId,
      contractId: idempotencyResult.result.contract_id ?? undefined,
      unsignedXDR: '',
      cached: true,
    });
    return;
  }
  // ── End idempotency check ──────────────────────────────────────────────

  const platformAddress = process.env.PLATFORM_STELLAR_ADDRESS;
  const usdcIssuer = process.env.USDC_TRUSTLINE_ADDRESS;
  if (!platformAddress || !usdcIssuer) {
    throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'Authentication is temporarily unavailable.', { retryable: true });
  }

  // trustlessWorkRequest throws TrustlessWorkRequestError on failure —
  // errorMiddleware maps those automatically; no catch needed here.
  const twData = await trustlessWorkRequest<{
    status: string;
    contractId?: string;
    unsignedTransaction?: string;
    message?: string;
  }>('/deployer/single-release', {
    method: 'POST',
    body: {
      engagementId: resolvedEngagementId,
      title: `SafeTrust Rental — ${apartmentId}`,
      description: `Security deposit for apartment ${apartmentId}`,
      signer: senderAddress,
      amount: terms.amount,
      platformFee: 0,
      roles: {
        approver: senderAddress,
        serviceProvider: terms.receiverAddress,
        receiver: terms.receiverAddress,
        platformAddress,
        releaseSigner: senderAddress,
        disputeResolver: platformAddress,
      },
      milestones: [{ description: 'Rental security deposit' }],
      trustline: {
        symbol: 'USDC',
        address: usdcIssuer,
      },
    },
  });

  // Persist pending escrow to DB — HasuraRequestError thrown on failure,
  // errorMiddleware maps it to DATABASE_ERROR automatically.
  await hasuraRequest(
    `mutation InsertEscrow(
      $contractId: String!
      $engagementId: String!
      $apartmentId: uuid!
      $senderAddress: String!
      $receiverAddress: String!
      $amount: numeric!
      $unsignedXdr: String
    ) {
      insert_escrows_one(object: {
        contract_id: $contractId
        engagement_id: $engagementId
        apartment_id: $apartmentId
        property_id: $apartmentId
        sender_address: $senderAddress
        receiver_address: $receiverAddress
        amount: $amount
        status: "pending_signature"
        unsigned_xdr: $unsignedXdr
        tenant_id: "safetrust"
      }) { id }
    }`,
    {
      contractId: twData.contractId ?? resolvedEngagementId,
      engagementId: resolvedEngagementId,
      apartmentId,
      senderAddress,
      receiverAddress: terms.receiverAddress,
      amount: terms.amount,
      unsignedXdr: twData.unsignedTransaction ?? '',
    },
  );

  const unsignedXdr = twData.unsignedTransaction ?? '';
  let txHash: string;
  let expiresAt: Date;
  try {
    txHash = transactionHash(unsignedXdr);
    expiresAt = transactionExpiry(unsignedXdr);
  } catch {
    throw new ApiError(502, 'TRUSTLESS_WORK_INVALID_XDR', 'The escrow provider returned an unreadable transaction.', { retryable: true });
  }

  await insertPendingAction({
    engagement_id: resolvedEngagementId,
    contract_id: twData.contractId ?? resolvedEngagementId,
    action: 'initialize',
    tx_hash: txHash,
    unsigned_xdr: unsignedXdr,
    built_for_uid: uid,
    signer_address: senderAddress,
    payload: {
      apartmentId,
      receiverAddress: terms.receiverAddress,
      amount: terms.amount,
      releaser: platformAddress,
    },
    expires_at: expiresAt,
  });

  res.status(200).json({
    status: twData.status,
    contractId: twData.contractId,
    unsignedXDR: unsignedXdr,
    engagementId: resolvedEngagementId,
  });
});
