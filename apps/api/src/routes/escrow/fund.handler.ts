import type { Request, Response } from 'express';
import { trustlessWorkRequest } from '../../services/trustlesswork.js';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';

type FundRequestBody = {
  contractId?: string;
  signer?: string;
  amount?: number;
  engagementId?: string;
};

type FundEscrowTWResponse = {
  unsignedXdr?: string;
  unsignedTransaction?: string;
  txHash?: string;
};

type FundResponse = {
  unsignedXdr: string;
  txHash: string;
  contractId: string;
  engagementId: string;
};

export const fundEscrowHandler = asyncHandler(async (
  req: Request<{}, FundResponse | { error: string }, FundRequestBody>,
  res: Response<FundResponse | { error: string }>,
) => {
  const { contractId, signer, amount, engagementId } = req.body || {};

  if (!contractId || !signer || typeof amount !== 'number' || !engagementId) {
    return res.status(400).json({
      error: 'Missing required fields: contractId, signer, amount, engagementId.',
    });
  }

  if (amount <= 0 || !Number.isFinite(amount)) {
    return res.status(400).json({
      error: 'Invalid amount: must be a positive number.',
    });
  }

  const result = await trustlessWorkRequest<FundEscrowTWResponse>(
    '/escrow/single-release/fund-escrow',
    {
      method: 'POST',
      body: { contractId, signer, amount },
    },
  );

  const unsignedXdr = result.unsignedXdr ?? result.unsignedTransaction;
  if (!unsignedXdr) {
    throw new ApiError(502, 'TRUSTLESS_WORK_EMPTY_RESPONSE', 'Unable to build the fund transaction.', { retryable: true });
  }

  return res.status(200).json({
    unsignedXdr,
    txHash: result.txHash ?? '',
    contractId,
    engagementId,
  });
});
