import type { Request, Response } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { ApiError } from '../../http/api-error.js';
import { buildEscrowAction, requireEngagementId } from './build-escrow-action.js';

type AuthedRequest = Request & { user?: { uid: string } };

/**
 * POST /api/escrow/dispute  { engagementId }
 * Either party (guest/approver or host/service provider) may open a dispute.
 * The dispute resolver (platform) may not; the contract forbids it.
 * Only while the escrow is funded or milestone_approved (enforced by the
 * Trustless Work contract and dbDisputeEscrow's conditional update).
 */
export const disputeHandler = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');
  const engagementId = requireEngagementId(req.body?.engagementId);

  const result = await buildEscrowAction({
    uid,
    engagementId,
    action: 'dispute',
    request: ({ signer, escrow }) => ({
      path: '/escrow/single-release/dispute-escrow',
      body: { contractId: escrow.contract_id, signer },
      payload: { signer },
    }),
  });

  return res.status(200).json(result);
});
