import { Request, Response } from 'express';
import { checkIdempotency } from '../../services/idempotency.js';
import { hasuraRequest } from '../../services/hasura.js';
import { trustlessWorkRequest } from '../../services/trustlesswork.js';

type DeployRequestBody = {
  apartmentId: string;
  senderAddress: string;
  receiverAddress: string;
  amount: number;
  engagementId?: string;
};

type DeployResponse = {
  status: string;
  contractId?: string;
  unsignedXDR: string;
  engagementId: string;
  cached?: boolean;
};

export const deployEscrowHandler = async (
  req: Request<Record<string, never>, DeployResponse | { error: string }, DeployRequestBody>,
  res: Response<DeployResponse | { error: string }>
): Promise<void> => {
  const { apartmentId, senderAddress, receiverAddress, amount, engagementId } =
    req.body;

  if (!apartmentId || !senderAddress || !receiverAddress || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({
      error: 'Missing required fields: apartmentId, senderAddress, receiverAddress, amount',
    });
    return;
  }

  const resolvedEngagementId = engagementId ?? `engagement-${apartmentId}`;

  // ── Idempotency check ──────────────────────────────────────────────────
  const idempotencyResult = await checkIdempotency(resolvedEngagementId);

  if (idempotencyResult.exists) {
    console.log(
      `[escrow/deploy] idempotent hit — engagementId: ${resolvedEngagementId}, ` +
      `contractId: ${idempotencyResult.result.contract_id}`
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
    res.status(500).json({
      error: 'Missing PLATFORM_STELLAR_ADDRESS or USDC_TRUSTLINE_ADDRESS server configuration.',
    });
    return;
  }

  try {
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
        amount,
        platformFee: 0,
        roles: {
          approver: senderAddress,
          serviceProvider: receiverAddress,
          receiver: receiverAddress,
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

    // Persist pending escrow to DB
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
        receiverAddress,
        amount,
        unsignedXdr: twData.unsignedTransaction ?? '',
      }
    );

    res.status(200).json({
      status: twData.status,
      contractId: twData.contractId,
      unsignedXDR: twData.unsignedTransaction ?? '',
      engagementId: resolvedEngagementId,
    });
  } catch (err) {
    console.error('[escrow/deploy] error:', err);
    res.status(500).json({ error: String(err) });
  }
};
