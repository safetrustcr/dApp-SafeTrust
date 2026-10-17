import type { Request, Response } from 'express'; import { findByTxHash, markPendingActionFailed } from '../../services/pending-actions.js';
import { applySubmittedAction } from '../../services/submitted-effects.js';
import { confirmTransactionOnLedger } from '../../services/stellar-confirm.js';
import { updateIndexerFromTxHash } from '../../services/trustlesswork.js';
import { assertEscrowParticipant } from '../../services/escrow-authz.ts';
import { getEscrowStatusByEngagementId } from '../../services/hasura.js';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';

const TX_HASH_REGEXP = /^[0-9a-f]{64}$/i;

/**
 * Any field other than `txHash` is rejected. The action, escrow,
 * amount and target status all come from the pending action row and the
 * ledger - never from the request body.
 */
const FORBIDDEN_FIELDS = [
  'action',
  'status',
  'amount',
  'contractId',
  'signer',
  'engagementId',
  'apartmentId',
  'senderAddress',
  'receiverAddress',
  'releaser',
  'milestoneId',
  'approver',
  'releaseSigner',
] as const;

type RecoverRequestBody = {
  txHash?: string;
  [key: string]: unknown };

type RecoverResponse = {
  recovered: boolean;
  txHash: string;
  status: string;
};

export const recoverFromTxhashHandler = asyncHandler(async (
  req: Request<{}, RecoverResponse | { error: string }, RecoverRequestBody>,
  res: Response<RecoverResponse | { error: string }>,
) => {
  const body = (req.body ?? {}) as RecoverRequestBody;

  // Reject any client-supplied field that could influence the transition.
  for (const field of Object.keys(body)) {
    if (field !== 'txHash') {
      throw new ApiError(400, 'FORBIDDEN_FIELD', `Field '${field}' is not allowed on this endpoint.`);
    }
  }

  const txHash = typeof body.txHash === 'string' ? body.txHash.trim() : '';
  if (!TX_HASH_REGEXP.test(txHash)) {
    throw new ApiError(400, 'INVALID_TX_HASH1', 'txHash must be a 64-character hex string.');
  }

  const uid = req.user?.uid;
  if (!uid) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required.');
  }

  // 1. Look up the pending action the API built for this hash.
  const pending = await findByTxHash(txHash);
  if (!pending) {
    // 404 for unknown hashes so callers can't probe which hashes exist.
    throw new ApiError(404, 'UNKNOWN_TRANSACTION', 'No pending action found for this transaction hash.');
  }

  // 2. Authorize: builder or a participant of the escrow. 404 on failure
  // so callers can't probe which hashes exist.
  if (pending.built_for_uid !== uid) {
    try {
      await assertEscrowParticipant(pending.engagement_id, uid);
    } catch {
      throw new ApiError(404, 'UNKNOWN_TRANSACTION', 'No pending action found for this transaction hash.');
    }
  }

  // 3. Idempotent: already confirmed - return the current escrow status.
  if (pending.status === 'confirmed') {
    const current = await getEscrowStatusByEngagementId(pending.engagement_id);
    return res.status(200).json({ recovered: true, txHash, status: current });
  }

  // 4. Confirm on the ledger.
  const confirmation = await confirmTransactionOnLedger(txHash);

  if (confirmation.status === 'not_found') {
    // 202 Pending - client retries, cron reconciler picks it up later.
    return res.status(202).json({ recovered: false, txHash, status: 'PENDING' });
  }

  if (confirmation.status === 'failed') {
    await markPendingActionFailed(pending.id);
    throw new ApiError(409, 'TRANSACTION_FAILED', 'The transaction failed on the ledger; the escrow was not changed.');
  }

  // 5. Apply the transition using the existing guarded path. The action,
  // escrow, amount and target status all come from the pending row.
  const result = await applySubmittedAction(pending, txHash, {
    source: 'submit',
    actorUid: uid,
  });

  // 6. Best-effort: tell Trustless Work's indexer about the transaction.
  try {
    await updateIndexerFromTxHash(txHash);
  } catch (err) {
    console.warn('[recover-from-txhash] indexer update failed', err);
  }

  return res.status(200).json({
    recovered: true,
    txHash,
    status: result.status,
  });
});
