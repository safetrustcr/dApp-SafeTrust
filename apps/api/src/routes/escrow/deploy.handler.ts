import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { checkIdempotency } from '../../services/idempotency.js';
import { hasuraRequest } from '../../services/hasura.js';
import { trustlessWorkRequest } from '../../services/trustlesswork.js';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { getApartmentEscrowTerms, ApartmentTermsError } from '../../services/apartment-escrow-terms.js';
import { getUserWallets } from '../../services/escrow-authz.js';
import { findLiveAction, insertPendingAction } from '../../services/pending-actions.js';
import { getHotelReservationEscrowTerms } from '../../services/hotel-reservation-escrow.js';
import { transactionExpiry, transactionHash } from '../../lib/stellar-xdr.js';

type DeployRequestBody = {
  apartmentId?: string;
  reservationId?: string;
  /** The connected wallet chosen by the guest. It must already belong to them. */
  senderAddress?: string;
};

type DeployResponse = {
  status: string;
  contractId?: string;
  unsignedXDR: string;
  engagementId: string;
  pendingActionId?: string;
  cached?: boolean;
};

export const deployEscrowHandler = asyncHandler(async (
  req: AuthenticatedRequest & Request<Record<string, never>, DeployResponse | { error: string }, DeployRequestBody>,
  res: Response<DeployResponse | { error: string }>,
) => {
  const { apartmentId, reservationId, senderAddress } = req.body;
  const uid = req.user?.uid;

  if ((!apartmentId && !reservationId) || (apartmentId && reservationId) || !senderAddress) {
    res.status(400).json({
      error: 'Provide exactly one apartmentId or reservationId, and senderAddress',
    });
    return;
  }
  if (!uid) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');
  }

  const hotelTerms = reservationId ? await getHotelReservationEscrowTerms(reservationId, uid, senderAddress) : null;
  let terms;
  if (hotelTerms) {
    terms = hotelTerms;
  } else {
    const callerWallets = await getUserWallets(uid);
    if (!callerWallets.includes(senderAddress)) {
      throw new ApiError(403, 'WALLET_NOT_REGISTERED', 'Connect and register the Stellar wallet that will sign this escrow.');
    }
    try {
      terms = await getApartmentEscrowTerms(apartmentId!);
    } catch (error) {
      if (error instanceof ApartmentTermsError) throw new ApiError(error.status, error.code, error.message);
      throw error;
    }
    if (terms.ownerUserId === uid) throw new ApiError(409, 'SELF_ESCROW_NOT_ALLOWED', 'You cannot create a rental escrow for your own apartment.');
  }
  const resolvedEngagementId =
    hotelTerms?.engagementId ??
    `rental:${apartmentId}:${uid}`;
  const propertyId = reservationId ?? apartmentId!;
  const tenantId = hotelTerms ? 'hotel_industry' : 'safetrust';

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
        pendingActionId: pending.id,
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
      title: hotelTerms ? `SafeTrust Hotel — ${reservationId}` : `SafeTrust Rental — ${apartmentId}`,
      description: hotelTerms ? `Payment for hotel reservation ${reservationId}` : `Security deposit for apartment ${apartmentId}`,
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
      milestones: [{ description: hotelTerms ? 'Hotel reservation payment' : 'Rental security deposit' }],
      trustline: {
        symbol: 'USDC',
        address: usdcIssuer,
      },
    },
  });

  const unsignedXdr = twData.unsignedTransaction ?? '';
  let txHash: string;
  let expiresAt: Date;
  try {
    txHash = transactionHash(unsignedXdr);
    expiresAt = transactionExpiry(unsignedXdr);
  } catch {
    throw new ApiError(502, 'TRUSTLESS_WORK_INVALID_XDR', 'The escrow provider returned an unreadable transaction.', { retryable: true });
  }


  // Persist pending escrow to DB — HasuraRequestError thrown on failure,
  // errorMiddleware maps it to DATABASE_ERROR automatically.
  await hasuraRequest(
    `mutation InsertEscrow(
      $contractId: String!
      $engagementId: String!
      $apartmentId: uuid
      $propertyId: String!
      $tenantId: String!
      $senderAddress: String!
      $receiverAddress: String!
      $amount: numeric!
      $unsignedXdr: String
    ) {
      insert_escrows_one(object: {
        contract_id: $contractId
        engagement_id: $engagementId
        apartment_id: $apartmentId
        property_id: $propertyId
        sender_address: $senderAddress
        receiver_address: $receiverAddress
        amount: $amount
        status: "pending_signature"
        unsigned_xdr: $unsignedXdr
        tenant_id: $tenantId
      }) { id }
    }`,
    {
      contractId: twData.contractId ?? resolvedEngagementId,
      engagementId: resolvedEngagementId,
      apartmentId: apartmentId ?? null,
      propertyId,
      tenantId,
      senderAddress,
      receiverAddress: terms.receiverAddress,
      amount: terms.amount,
      unsignedXdr: twData.unsignedTransaction ?? '',
    },
  );


  const pendingAction = await insertPendingAction({
    engagement_id: resolvedEngagementId,
    contract_id: twData.contractId ?? null,
    action: 'initialize',
    tx_hash: txHash,
    unsigned_xdr: unsignedXdr,
    built_for_uid: uid,
    signer_address: senderAddress,
    payload: {
      apartmentId,
      tenantId,
      ...(hotelTerms ? { reservationId, booking: hotelTerms.reservation } : {}),
      receiverAddress: terms.receiverAddress,
      amount: terms.amount,
      releaser: senderAddress,
    },
    expires_at: expiresAt,
  });

  res.status(200).json({
    status: twData.status,
    contractId: twData.contractId,
    unsignedXDR: unsignedXdr,
    engagementId: resolvedEngagementId,
    pendingActionId: pendingAction.id,
  });
});
