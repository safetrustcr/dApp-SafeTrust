import type { Request, Response } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { ApiError } from '../../http/api-error.js';
import { buildEscrowAction, requireEngagementId } from './build-escrow-action.js';
import { milestoneIdFor, parseMilestoneIndex } from './milestones.js';

type AuthedRequest = Request & { user?: { uid: string } };

/**
 * POST /api/escrow/milestone-status  { engagementId, milestoneIndex?, newEvidence? }
 * Only the service provider (host) wallet may mark a milestone completed.
 */
export const milestoneStatusHandler = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');
  const engagementId = requireEngagementId(req.body?.engagementId);
  const milestoneIndex = parseMilestoneIndex(req.body?.milestoneIndex);

  const evidence = req.body?.newEvidence;
  if (evidence !== undefined && (typeof evidence !== 'string' || evidence.length > 500)) {
    throw new ApiError(400, 'INVALID_EVIDENCE', 'newEvidence must be text up to 500 characters.');
  }
  const newEvidence = typeof evidence === 'string' ? evidence : '';

  const result = await buildEscrowAction({
    uid,
    engagementId,
    action: 'mark_milestone_completed',
    request: ({ signer, escrow }) => ({
      path: '/escrow/single-release/change-milestone-status',
      body: {
        contractId: escrow.contract_id,
        serviceProvider: signer,
        milestoneIndex: String(milestoneIndex),
        newStatus: 'completed',
        newEvidence,
      },
      payload: { milestoneIndex, milestoneId: milestoneIdFor(milestoneIndex), newStatus: 'completed' },
    }),
  });

  return res.status(200).json(result);
});
