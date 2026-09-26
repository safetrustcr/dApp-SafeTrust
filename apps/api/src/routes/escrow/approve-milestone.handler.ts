import type { Request, Response } from 'express';
import { TrustlessWorkRequestError, getErrorMessages, trustlessWorkRequest } from '../../services/trustlesswork.js';

type ApproveMilestoneBody = {
  contractId?: string;
  engagementId?: string;
  approver?: string;
  milestoneIndex?: number;
};

export async function approveMilestoneHandler(
  req: Request<{}, unknown, ApproveMilestoneBody>,
  res: Response,
): Promise<Response> {
  try {
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
      return res.status(502).json({ error: 'Trustless Work returned no unsigned transaction.', payload: result });
    }
    return res.status(200).json({ unsignedXdr, txHash: result.txHash ?? '', contractId, engagementId });
  } catch (error) {
    if (error instanceof TrustlessWorkRequestError) {
      return res.status(error.statusCode).json({ error: error.message, messages: error.messages, payload: error.payload });
    }
    return res.status(500).json({ error: getErrorMessages(error, 'Failed to build milestone approval transaction.')[0] });
  }
}
