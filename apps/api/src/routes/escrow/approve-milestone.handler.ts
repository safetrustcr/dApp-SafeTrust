import type { Request, Response } from 'express';
import { trustlessWorkRequest } from '../../services/trustlesswork.js';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';

type ApproveMilestoneBody = {
  contractId?: string;
  engagementId?: string;
  approver?: string;
  milestoneIndex?: number;
};

export const approveMilestoneHandler = asyncHandler(async (
  req: Request<{}, unknown, ApproveMilestoneBody>,
  res: Response,
) => {
  const { contractId, engagementId, approver, milestoneIndex = 0 } = req.body ?? {};

  if (!contractId || !engagementId || !approver) {
    return res.status(400).json({ error: 'Missing required fields: contractId, engagementId, approver.' });
  }
  if (!Number.isInteger(milestoneIndex) || milestoneIndex < 0) {
    return res.status(400).json({ error: 'milestoneIndex must be a non-negative integer.' });
  }

  const result = await trustlessWorkRequest<{ unsignedXdr?: string; unsignedTransaction?: string; txHash?: string }>(
    '/escrow/single-release/approve-milestone',
    {
      method: 'POST',
      body: { contractId, approver, milestoneIndex: String(milestoneIndex) },
    },
  );

  const unsignedXdr = result.unsignedXdr ?? result.unsignedTransaction;
  if (!unsignedXdr) {
    throw new ApiError(502, 'TRUSTLESS_WORK_EMPTY_RESPONSE', 'Unable to build the milestone approval transaction.', { retryable: true });
  }

  return res.status(200).json({ unsignedXdr, txHash: result.txHash ?? '', contractId, engagementId });
});
