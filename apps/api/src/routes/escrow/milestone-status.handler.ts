import type { Request, Response } from 'express';
import { trustlessWorkRequest, TrustlessWorkRequestError, getErrorMessages } from '../../services/trustlesswork.js';
import { guardEscrowAction, sendConflict } from './transition-guard.js';
import { asyncHandler } from '../../http/async-handler.js';

type MilestoneStatusRequestBody = {
  contractId?: string;
  serviceProvider?: string;
  engagementId?: string;
  milestoneIndex?: number;
  newStatus?: string;
  newEvidence?: string;
};

type ChangeMilestoneStatusTWResponse = {
  unsignedXdr?: string;
  unsignedTransaction?: string;
  txHash?: string;
};

type MilestoneStatusResponse = {
  unsignedXdr: string;
  txHash: string;
  contractId: string;
  engagementId: string;
  status: string;
};

type MilestoneStatusErrorResponse = {
  error: string;
  messages?: string[];
  payload?: unknown;
};

export const milestoneStatusHandler = asyncHandler(async (
  req: Request<{}, MilestoneStatusResponse | MilestoneStatusErrorResponse, MilestoneStatusRequestBody>,
  res: Response<MilestoneStatusResponse | MilestoneStatusErrorResponse>,
) => {
  const { contractId, serviceProvider, engagementId, milestoneIndex, newStatus, newEvidence } = req.body || {};

  if (!contractId || !serviceProvider || !engagementId) {
    return res.status(400).json({
      error: 'Missing required fields: contractId, serviceProvider, engagementId.',
    });
  }

  const validStatuses = ['completed'];
  const resolvedStatus = newStatus ?? 'completed';
  if (!validStatuses.includes(resolvedStatus)) {
    return res.status(400).json({
      error: `Invalid newStatus: must be one of ${validStatuses.join(', ')}.`,
    });
  }

  const resolvedIndex = milestoneIndex ?? 0;
  if (!Number.isInteger(resolvedIndex) || resolvedIndex < 0) {
    return res.status(400).json({
      error: 'Invalid milestoneIndex: must be a non-negative integer.',
    });
  }

  try {
    const conflict = await guardEscrowAction(res, 'mark_milestone_completed', contractId);
    if (conflict) return conflict;

    const result = await trustlessWorkRequest<ChangeMilestoneStatusTWResponse>(
      '/escrow/single-release/change-milestone-status',
      {
        method: 'POST',
        body: {
          contractId,
          serviceProvider,
          milestoneIndex: String(resolvedIndex),
          newStatus: resolvedStatus,
          newEvidence: newEvidence ?? '',
        },
      },
    );

    const unsignedXdr = result.unsignedXdr ?? result.unsignedTransaction;
    if (!unsignedXdr) {
      return res.status(502).json({
        error: 'TrustlessWork milestone-status request returned no unsigned transaction.',
        payload: result,
      });
    }

    return res.status(200).json({
      unsignedXdr,
      txHash: result.txHash ?? '',
      contractId,
      engagementId,
      // A service-provider completion is not tenant approval. The aggregate
      // escrow moves to milestone_approved only after approve-milestone is
      // signed by the approver and submitted.
      status: 'funded',
    });
  } catch (error) {
    const conflict = sendConflict(res, error);
    if (conflict) return conflict;

    if (error instanceof TrustlessWorkRequestError) {
      return res.status(error.statusCode).json({
        error: error.message,
        messages: error.messages,
        payload: error.payload,
      });
    }

    const messages = getErrorMessages(error, 'Failed to build milestone status transaction.');
    return res.status(500).json({
      error: messages[0],
      messages,
    });
  }
});
