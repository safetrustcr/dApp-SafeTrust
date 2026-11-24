import type { Request, Response } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { ApiError } from '../../http/api-error.js';
import { buildEscrowAction, requireEngagementId } from './build-escrow-action.js';

type AuthedRequest = Request & { user?: { uid: string } };

/**
 * POST /api/escrow/release-funds  { engagementId }
 * Only the release signer (guest) wallet may release.
 */
export const releaseFundsHandler = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');
  const engagementId = requireEngagementId(req.body?.engagementId);

  const result = await buildEscrowAction({
    uid,
    engagementId,
    action: 'release_funds',
    request: ({ signer, escrow }) => ({
      path: '/escrow/single-release/release-funds',
      body: { contractId: escrow.contract_id, releaseSigner: signer },
      payload: { releaseSigner: signer },
    }),
  });

  return res.status(200).json(result);
});
