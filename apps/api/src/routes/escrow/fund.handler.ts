import type { Request, Response } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { ApiError } from '../../http/api-error.js';
import { buildEscrowAction, requireEngagementId } from './build-escrow-action.js';

type AuthedRequest = Request & { user?: { uid: string } };

/**
 * POST /api/escrow/fund  { engagementId }
 * Signer (approver) and amount come from the escrow record, never the body.
 */
export const fundEscrowHandler = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');
  const engagementId = requireEngagementId(req.body?.engagementId);

  const result = await buildEscrowAction({
    uid,
    engagementId,
    action: 'fund',
    request: ({ signer, escrow }) => ({
      path: '/escrow/single-release/fund-escrow',
      body: { contractId: escrow.contract_id, signer, amount: Number(escrow.amount) },
      payload: { amount: Number(escrow.amount) },
    }),
  });

  return res.status(200).json(result);
});
