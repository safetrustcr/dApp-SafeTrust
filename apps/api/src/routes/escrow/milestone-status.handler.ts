import { Request, Response } from 'express';
import { trustlessWorkRequest, TrustlessWorkRequestError, getErrorMessages } from '../../services/trustlesswork.js';

type MilestoneStatusRequestBody = {
  contractId?: string;
  serviceProvider?: string;
  engagementId?: string;
  milestoneIndex?: number;
  newStatus?: string;
  newEvidence?: string;
};

type ChangeMilestoneStatusTWResponse = {
  unsignedXdr: string;
  txHash: string;
};

type MilestoneStatusResponse = {
  unsignedXdr: string;
  txHash: string;
  contractId: string;
  engagementId: string;
  status: string;
};

export const milestoneStatusHandler = async (
  req: Request<{}, MilestoneStatusResponse | { error: string; messages?: string[]; payload?: unknown }, MilestoneStatusRequestBody>,
  res: Response<MilestoneStatusResponse | { error: string; messages?: string[]; payload?: unknown }>
): Promise<Response> => {
  try {
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

    const result = await trustlessWorkRequest<ChangeMilestoneStatusTWResponse>(
      '/escrow/single-release/v2/change-milestone-status',
      {
        method: 'POST',
        body: {
          contractId,
          serviceProvider,
          updates: [
            {
              index: resolvedIndex,
              newStatus: resolvedStatus,
              ...(newEvidence ? { newEvidence } : {}),
            },
          ],
        },
      },
    );

    return res.status(200).json({
      unsignedXdr: result.unsignedXdr,
      txHash: result.txHash,
      contractId,
      engagementId,
      status: 'milestone_approved',
    });
  } catch (error) {
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
};
