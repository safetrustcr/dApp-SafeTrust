import type { Request, Response } from 'express';
import { trustlessWorkRequest } from '../../services/trustlesswork.js';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';

type ReleaseRequestBody = {
  contractId?: string;
  releaseSigner?: string;
  engagementId?: string;
};

type ReleaseFundsTWResponse = {
  unsignedXdr?: string;
  unsignedTransaction?: string;
  txHash?: string;
  status?: string;
  message?: string;
};

type ReleaseResponse = {
  unsignedXdr?: string;
  unsignedXDR?: string;
  txHash?: string;
  contractId?: string;
  engagementId?: string;
  status?: string;
  message?: string;
};

export const releaseFundsHandler = asyncHandler(async (
  req: Request<{}, ReleaseResponse | { error: string }, ReleaseRequestBody>,
  res: Response<ReleaseResponse | { error: string }>,
) => {
  const { contractId, releaseSigner, engagementId } = req.body || {};

  if (!contractId || !releaseSigner) {
    return res.status(400).json({
      error: 'Missing required fields: contractId, releaseSigner.',
    });
  }

  const result = await trustlessWorkRequest<ReleaseFundsTWResponse>(
    '/escrow/single-release/release-funds',
    {
      method: 'POST',
      body: { contractId, releaseSigner },
    },
  );

  // Note: unsignedXdr is the canonical key; unsignedXDR is kept for legacy frontend consumers
  // and will be removed once all callers migrate to unsignedXdr.
  const unsignedXdr = result.unsignedXdr ?? result.unsignedTransaction;

  if (!unsignedXdr || result.status === 'FAILED') {
    throw new ApiError(502, 'TRUSTLESS_WORK_EMPTY_RESPONSE', 'Unable to build the release transaction.', { retryable: true });
  }

  return res.status(200).json({
    unsignedXdr,
    unsignedXDR: unsignedXdr,
    txHash: result.txHash ?? '',
    contractId,
    engagementId: engagementId ?? '',
    status: 'completed',
  });
});
