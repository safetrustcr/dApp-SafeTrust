/**
 * Shared flow for every build endpoint (fund, milestone-status, approve-milestone,
 * release-funds, resolve-dispute):
 *
 *   authorize caller wallet + role
 *   → reuse the live unsigned XDR for this escrow + action, if any
 *   → otherwise ask Trustless Work to build one
 *   → record it in escrow_pending_actions under its tx hash
 */
import { ApiError } from '../../http/api-error.js';
import {
  authorizeEscrowAction,
  EscrowAccessError,
  type EscrowAction,
  type EscrowRecord,
  type EscrowRoles,
} from '../../services/escrow-authz.js';
import {
  expireStaleActions,
  findLiveAction,
  insertPendingAction,
  isExpired,
  type PendingAction,
} from '../../services/pending-actions.js';
import { trustlessWorkRequest } from '../../services/trustlesswork.js';
import { transactionExpiry, transactionHash } from '../../lib/stellar-xdr.js';

export type BuildContext = { signer: string; escrow: EscrowRecord; roles: EscrowRoles };

export type BuildRequest = {
  path: string;
  body: Record<string, unknown>;
  /** Server-derived parameters the submit step needs (amount, milestone, distributions…). */
  payload?: Record<string, unknown>;
};

export type BuildResult = {
  unsignedXdr: string;
  txHash: string;
  engagementId: string;
  contractId: string | null;
  expiresAt: string;
  reused: boolean;
};

const ENGAGEMENT_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

export function requireEngagementId(value: unknown): string {
  if (typeof value !== 'string' || !ENGAGEMENT_ID.test(value)) {
    throw new ApiError(400, 'INVALID_ENGAGEMENT_ID', 'engagementId is required.');
  }
  return value;
}

export function toApiError(err: unknown): never {
  if (err instanceof EscrowAccessError) throw new ApiError(err.status, err.code, err.message);
  throw err;
}

function fromRow(row: PendingAction, reused: boolean): BuildResult {
  return {
    unsignedXdr: row.unsigned_xdr,
    txHash: row.tx_hash,
    engagementId: row.engagement_id,
    contractId: row.contract_id,
    expiresAt: row.expires_at,
    reused,
  };
}

function isUniqueViolation(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /uniqueness violation|duplicate key|constraint-violation|escrow_pending_actions_live/i.test(message);
}

export async function buildEscrowAction(opts: {
  uid: string;
  engagementId: string;
  action: EscrowAction;
  requireContract?: boolean;
  request: (ctx: BuildContext) => BuildRequest | Promise<BuildRequest>;
}): Promise<BuildResult> {
  const { uid, engagementId, action, requireContract = true } = opts;

  const ctx = await authorizeEscrowAction(uid, engagementId, action).catch(toApiError);
  if (requireContract && !ctx.escrow.contract_id) {
    throw new ApiError(409, 'ESCROW_NOT_DEPLOYED', 'This escrow has no on-chain contract yet.');
  }

  // Reuse an unexpired transaction for the same escrow + action.
  await expireStaleActions(engagementId, action);
  const live = await findLiveAction(engagementId, action);
  if (live && !isExpired(live)) {
    if (live.status === 'submitted') {
      throw new ApiError(409, 'ACTION_IN_FLIGHT', 'This action was already submitted and is awaiting confirmation.');
    }
    if (live.built_for_uid !== uid) {
      throw new ApiError(409, 'ACTION_RESERVED', 'Another participant is already signing this action.');
    }
    return fromRow(live, true);
  }

  const { path, body, payload = {} } = await opts.request(ctx);
  const result = await trustlessWorkRequest<{ unsignedXdr?: string; unsignedTransaction?: string }>(path, {
    method: 'POST',
    body,
  });
  const unsignedXdr = result.unsignedXdr ?? result.unsignedTransaction;
  if (!unsignedXdr) {
    throw new ApiError(502, 'TRUSTLESS_WORK_EMPTY_RESPONSE', 'Unable to build the transaction. Try again.', {
      retryable: true,
    });
  }

  let txHash: string;
  let expiresAt: Date;
  try {
    txHash = transactionHash(unsignedXdr);
    expiresAt = transactionExpiry(unsignedXdr);
  } catch {
    throw new ApiError(502, 'TRUSTLESS_WORK_INVALID_XDR', 'The escrow provider returned an unreadable transaction.', {
      retryable: true,
    });
  }

  try {
    const row = await insertPendingAction({
      engagement_id: engagementId,
      contract_id: ctx.escrow.contract_id,
      action,
      tx_hash: txHash,
      unsigned_xdr: unsignedXdr,
      built_for_uid: uid,
      signer_address: ctx.signer,
      payload,
      expires_at: expiresAt,
    });
    return fromRow(row, false);
  } catch (err) {
    // A concurrent build for the same escrow + action won the race: return its XDR.
    if (isUniqueViolation(err)) {
      const winner = await findLiveAction(engagementId, action);
      if (winner && winner.built_for_uid === uid && winner.status === 'built') return fromRow(winner, true);
      throw new ApiError(409, 'ACTION_IN_FLIGHT', 'This action is already being processed.');
    }
    throw err;
  }
}
