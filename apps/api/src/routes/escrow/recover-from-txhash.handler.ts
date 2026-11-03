import type { Request, Response } from 'express';
import { updateIndexerFromTxHash } from '../../services/trustlesswork.js';
import {
  claimForSubmission,
  getPendingActionByHash,
  markConfirmed,
  markFailed,
  type PendingAction,
} from '../../services/pending-actions.js';
import { assertEscrowParticipant, EscrowAccessError } from '../../services/escrow-authz.js';
import { confirmTransaction } from '../../services/stellar-confirm.js';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';
import { applySubmittedAction } from './submitted-effects.js';

const TX_HASH_REGEX = /^[0-9a-f]{64}$/i;

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
  'disputer',
  'resolver',
] as const;

type AuthedRequest = Request & { user?: { uid: string } };

type RecoverRequestBody = {
  txHash?: string;
  [key: string]: unknown;
};

type RecoverResponse = {
  recovered: boolean;
  action: string;
  contractId: string | null;
  txHash: string;
  status: string;
};

type PendingResponse = {
  status: 'PENDING';
  txHash: string;
};

/**
 * POST /api/escrow/recover-from-txhash  { txHash }
 *
 * For a transaction the user signed and submitted, but whose result SafeTrust
 * never recorded (closed tab, dropped connection). The ledger decides whether
 * it happened; the action and parameters come from the pending-action row.
 */
export const recoverFromTxhashHandler = asyncHandler(async (
  req: AuthedRequest,
  res: Response<RecoverResponse | PendingResponse>,
) => {
  const uid = req.user?.uid;
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');

  const body = (req.body || {}) as RecoverRequestBody;

  // 1. Reject any client-supplied transition input.
  for (const field of FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      throw new ApiError(400, 'FORBIDDEN_FIELD', `Field '${field}' is not allowed; send only txHash`);
    }
  }

  const txHash = typeof body.txHash === 'string' ? body.txHash.trim() : '';
  if (!TX_HASH_REGEX.test(txHash)) {
    throw new ApiError(400, 'INVALID_TX_HASH', 'txHash must be 64 hex characters');
  }

  // 2. Load the pending action SafeTrust built for this hash.
  const pendingAction = await getPendingActionByHash(txHash);
  if (!pendingAction) {
    throw new ApiError(404, 'UNKNOWN_TRANSACTION', 'No pending action found for this transaction hash');
  }

  // 3. Authorize: built_for_uid OR this escrow's participant. Return 404
  // (not 403) so callers can't probe which hashes exist.
  if (pendingAction.built_for_uid !== uid) {
    try {
      await assertEscrowParticipant(uid, pendingAction.engagement_id);
    } catch (err) {
      if (err instanceof EscrowAccessError) {
        throw new ApiError(404, 'UNKNOWN_TRANSACTION', 'No pending action found for this transaction hash');
      }
      throw err;
    }
  }

  // 4. Idempotent: effects were already applied at submit time.
  if (pendingAction.status === 'submitted' || pendingAction.status === 'confirmed') {
    return res.status(200).json(recoveredBody(pendingAction, txHash));
  }
  if (pendingAction.status === 'failed') {
    throw new ApiError(409, 'TRANSACTION_FAILED', 'Transaction failed on the ledger');
  }

  // 5. Confirm on the ledger.
  const confirmation = await confirmTransaction(txHash);

  if (confirmation === 'unknown') {
    // Not on the ledger yet (or Horizon unreachable). Client retries.
    return res.status(202).json({ status: 'PENDING', txHash });
  }

  if (confirmation === 'failed') {
    await markFailed(pendingAction.id);
    throw new ApiError(409, 'TRANSACTION_FAILED', 'Transaction failed on the ledger');
  }

  // 6. Claim so a concurrent send-transaction can't apply the same effects twice.
  const claimed = await claimForSubmission(pendingAction.id);
  if (!claimed) {
    const latest = await getPendingActionByHash(txHash);
    return res.status(200).json(recoveredBody(latest ?? pendingAction, txHash));
  }

  await applySubmittedAction(pendingAction, { txHash, contractId: pendingAction.contract_id, twResult: null });
  await markConfirmed(pendingAction.id);

  // 7. Best-effort: tell Trustless Work's indexer about the transaction.
  await updateIndexerFromTxHash(txHash);

  return res.status(200).json({ ...recoveredBody(pendingAction, txHash), status: 'confirmed' });
});

function recoveredBody(row: Pick<PendingAction, 'action' | 'contract_id' | 'status'>, txHash: string): RecoverResponse {
  return {
    recovered: true,
    action: row.action,
    contractId: row.contract_id,
    txHash,
    status: row.status,
  };
}
