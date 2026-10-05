import type { Request, Response } from 'express';
import { trustlessWorkRequest } from '../../services/trustlesswork.js';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';

type ResolveDisputeBody = {
  contractId?: string;
  engagementId?: string;
  disputeResolver?: string;
  distributions?: Array<{ address: string; amount: number }>;
};

export const resolveDisputeHandler = asyncHandler(async (
  req: Request<{}, unknown, ResolveDisputeBody>,
  res: Response,
) => {
  const { contractId, engagementId, disputeResolver, distributions } = req.body ?? {};

  if (!contractId || !engagementId || !disputeResolver || !Array.isArray(distributions) || distributions.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: contractId, engagementId, disputeResolver, distributions.' });
  }
  if (distributions.some(({ address, amount }) => !address || !Number.isFinite(amount) || amount <= 0)) {
    return res.status(400).json({ error: 'Every distribution needs a recipient address and a positive amount.' });
  }

  const result = await trustlessWorkRequest<{ unsignedXdr?: string; unsignedTransaction?: string; txHash?: string }>(
    '/escrow/single-release/resolve-dispute',
    { method: 'POST', body: { contractId, disputeResolver, distributions } },
  );

  const unsignedXdr = result.unsignedXdr ?? result.unsignedTransaction;
  if (!unsignedXdr) {
    throw new ApiError(502, 'TRUSTLESS_WORK_EMPTY_RESPONSE', 'Unable to build the dispute-resolution transaction.', { retryable: true });
  }

  return res.status(200).json({ unsignedXdr, txHash: result.txHash ?? '', contractId, engagementId });
});
