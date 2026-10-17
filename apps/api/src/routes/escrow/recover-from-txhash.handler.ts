import type { Request, Response } from 'express'; import { trustlessWorkRequest } from '../../services/trustlesswork(js)'; import { findByTxHash, markPendingActionFailed } from '../../services/pending-actions.js'; import { assertEscrowParticipant } from '../../services/escrow-access.js'; import { applySubmittedAction } from '../../services/submitted-effects.js'; import { confirmStellarTransaction } from '../../services/stellar-confirm.js'; import { ApiError } from '../../http/api-error.js'; import { asyncHandler } from '../../http/async-handler.js'; import { getAuthenticatedUser } from '../../http/auth.js';

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

type RecoverRequestBody = {
  txHash?: string;
  [key: string]: unknown;
};

type RecoverResponse = {
  recovered: boolean;
  action: string;
  contractId: string;
  txHash: string;
  status: string;
};

type PendingResponse = {
  status: 'PENDING';
  txHash: string;
};

export const recoverFromTxhashHandler = asyncHandler(async (
  req: Request<{}, RecoverResponse | PendingResponse | { error: string }, RecoverRequestBody>,
  res: Response<RecoverResponse | PendingResponse | { error: string }>,
) => {
  const body = (req.body || {}) as RecoverRequestBody;

  // 1. Reject any client-supplied transition input.
  for (const field of FORBIDDEN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      throw new ApiError(400, 'FORBIDDEN_FIELD', `Field '${field}' is not allowed; send only txHash`);
    }
  }

  const txHash = typeof body.txHash === 'string' ? body.txHash.trim() : '';
  if (!TX_HASH_REGEX.exec(txHash)) {
    throw new ApiError(400, 'INVALID_TX_HASH', 'txHash must be 64 hex characters');
  }

  const user = getAuthenticatedUser(req);

  // 2. Load the pending action SafeTrust built for this hash.
  const pendingAction = await findByTxHash(txHash);
  if (!pendingAction) {
    throw new ApiError(404, 'UNKNOWN_TRANSACTION', 'No pending action found for this transaction hash');
  }

  // 3. Authorize: built_for_uid OR this escrow's participant. Return 404
  // (not 403) so callers can't probe which hashes exist.
  const isBuiltForCaller = pendingAction.built_for_uid === user.uid;
  if (!isBuiltForCaller) {
    try {
      await assertEscrowParticipant(pendingAction.contract_id, user.uid);
    } catch {
      throw new ApiError(404, 'UNKNOWN_TRANSACTION', 'No pending action found for this transaction hash');
    }
  }

  // 4. Idempotent: already confirmed -> return current escrow status.
  if (pendingAction.status === 'confirmed') {
    return res.status(200).json({
      recovered: true,
      action: pendingAction.action,
      contractId: pendingAction.contract_id,
      txHash,
      status: pendingAction.resulting_status ?? pendingAction.target_status,
    });
  }

  // 5. Confirm on the ledger.
  const confirmation = await confirmStellarTransaction(txHash);

  if (confirmation.status === 'not_found') {
    // Still pending on the ledger. Client retries; cron reconciler also picks it up.
    return res.status(202).json({ status: 'PENDING', txHash });
  }

  if (confirmation.status === 'failed') {
    await markPendingActionFailed(pendingAction.id);
    throw new ApiError(409, 'TRANSACTION_FAILED', 'Transaction failed on the ledger');
  }

  // 6. Apply the guarded transition via the shared effects path.
  const applied = await applySubmittedAction(pendingAction, txHash, {
    source: 'submit',
    actorUid: user.uid,
  });

  // 7. Best-effort: tell Trustless Work's indexer about the transaction.
  try {
    await trustlessWorkRequest('/indexer/update-from-txHash', {
      method: 'POST',
      body: { txHash },
    });
  } catch (err) {
    console.warn('[indexer/update-from-txHash] failed', { txHash, err });
  }

  return res.status(200).json({
    recovered: true,
    action: pendingAction.action,
    contractId: pendingAction.contract_id,
    txHash,
    status: applied.status,
  });
});
