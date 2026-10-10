import type { Request, Response } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { ApiError } from '../../http/api-error.js';
import { buildEscrowAction, requireEngagementId } from './build-escrow-action.js';
import { milestoneIdFor, parseMilestoneIndex } from './milestones.js';

type AuthedRequest = Request & { user?: { uid: string } };

/**
 * POST /api/escrow/approve-milestone  { engagementId, milestoneIndex? }
 * Only the approver (guest) wallet may approve.
 */
export const approveMilestoneHandler = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');
  const engagementId = requireEngagementId(req.body?.engagementId);
  const milestoneIndex = parseMilestoneIndex(req.body?.milestoneIndex);

  const result = await buildEscrowAction({
    uid,
    engagementId,
    action: 'approve_milestone',
    request: ({ signer, escrow }) => ({
      path: '/escrow/single-release/approve-milestone',
      body: { contractId: escrow.contract_id, approver: signer, milestoneIndex: String(milestoneIndex) },
      payload: { milestoneIndex, milestoneId: milestoneIdFor(milestoneIndex), approver: signer },
    }),
  });

  return res.status(200).json(result);
});
