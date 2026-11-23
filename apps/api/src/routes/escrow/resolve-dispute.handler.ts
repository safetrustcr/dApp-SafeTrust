import type { Request, Response } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { ApiError } from '../../http/api-error.js';
import { buildEscrowAction, requireEngagementId } from './build-escrow-action.js';

type AuthedRequest = Request & { user?: { uid: string } };

type Share = { role: 'approver' | 'serviceProvider'; amount: number };

const toStroops = (v: number) => Math.round(v * 1e7);

export function parseShares(value: unknown, total: number): Share[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ApiError(400, 'INVALID_DISTRIBUTIONS', 'distributions must be a non-empty list.');
  }
  const shares = value.map((item) => {
    const role = (item as Share)?.role;
    const amount = Number((item as Share)?.amount);
    if ((role !== 'approver' && role !== 'serviceProvider') || !Number.isFinite(amount) || amount < 0) {
      throw new ApiError(400, 'INVALID_DISTRIBUTIONS', 'Each distribution needs role "approver" or "serviceProvider" and a non-negative amount.');
    }
    return { role, amount };
  });
  const sumStroops = shares.reduce((acc, s) => acc + toStroops(s.amount), 0);
  const totalStroops = toStroops(total);
  if (sumStroops !== totalStroops) {
    throw new ApiError(400, 'DISTRIBUTION_MISMATCH', `Distributions must add up to the escrow amount (${total}).`);
  }
  const nonZeroShares = shares.filter((s) => toStroops(s.amount) > 0);
  if (nonZeroShares.length === 0) {
    throw new ApiError(400, 'INVALID_DISTRIBUTIONS', 'At least one distribution must have a positive amount.');
  }
  return nonZeroShares;
}

/**
 * POST /api/escrow/resolve-dispute  { engagementId, distributions: [{ role, amount }] }
 * Requires the admin role (route) and the platform dispute-resolver wallet (authz).
 * Recipient addresses come from the escrow roles — the browser can't redirect funds.
 */
export const resolveDisputeHandler = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');
  const engagementId = requireEngagementId(req.body?.engagementId);

  const result = await buildEscrowAction({
    uid,
    engagementId,
    action: 'resolve_dispute',
    request: ({ signer, escrow, roles }) => {
      const shares = parseShares(req.body?.distributions, Number(escrow.amount));
      const distributions = shares.map((s) => ({ address: roles[s.role], amount: s.amount }));
      return {
        path: '/escrow/single-release/resolve-dispute',
        body: { contractId: escrow.contract_id, disputeResolver: signer, distributions },
        payload: { distributions },
      };
    },
  });

  return res.status(200).json(result);
});
