import type { Request, Response } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { ApiError } from '../../http/api-error.js';
import { InvalidXdrError, isSignedBy, transactionHash } from '../../lib/stellar-xdr.js';
import {
  claimForSubmission,
  getPendingActionByHash,
  isExpired,
  releaseClaim,
} from '../../services/pending-actions.js';
import { trustlessWorkRequest } from '../../services/trustlesswork.js';
import { applySubmittedAction } from './submitted-effects.js';

type AuthedRequest = Request & { user?: { uid: string } };

type SendTransactionTWResponse = {
  status?: string;
  message?: string;
  contractId?: string;
  escrow?: { contractId?: string };
};

/**
 * POST /api/escrow/send-transaction  { signedXdr }
 *
 * Nothing else in the body is read. The action, escrow, signer and parameters
 * come from the escrow_pending_actions row whose tx_hash matches the signed XDR.
 */
export const sendTransactionHandler = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const uid = req.user?.uid;
  if (!uid) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in first.');

  const signedXdr = req.body?.signedXdr;
  if (typeof signedXdr !== 'string' || signedXdr.trim() === '') {
    throw new ApiError(400, 'SIGNED_XDR_REQUIRED', 'signedXdr is required.');
  }

  let txHash: string;
  try {
    txHash = transactionHash(signedXdr);
  } catch (err) {
    if (err instanceof InvalidXdrError) throw new ApiError(400, 'INVALID_XDR', err.message);
    throw err;
  }

  const pending = await getPendingActionByHash(txHash);
  if (!pending) {
    throw new ApiError(404, 'UNKNOWN_TRANSACTION', 'Unknown transaction. Build it through SafeTrust first.');
  }
  if (pending.built_for_uid !== uid) {
    throw new ApiError(403, 'TRANSACTION_NOT_YOURS', 'This transaction was built for another user.');
  }
  if (pending.status === 'submitted' || pending.status === 'confirmed') {
    // Idempotent replay: same answer, no second call to Trustless Work.
    return res.status(200).json(replayBody(pending, txHash));
  }
  if (pending.status !== 'built' || isExpired(pending)) {
    throw new ApiError(410, 'TRANSACTION_EXPIRED', 'Transaction expired. Build it again.');
  }
  if (!isSignedBy(signedXdr, pending.signer_address)) {
    throw new ApiError(400, 'MISSING_SIGNATURE', 'The transaction is not signed by the wallet that holds this escrow role.');
  }

  // Claim before calling Trustless Work: concurrent duplicates can't double-submit.
  const claimed = await claimForSubmission(pending.id);
  if (!claimed) {
    const latest = await getPendingActionByHash(txHash);
    return res.status(200).json(replayBody(latest ?? pending, txHash));
  }

  let twResult: SendTransactionTWResponse;
  try {
    twResult = await trustlessWorkRequest<SendTransactionTWResponse>('/helper/send-transaction', {
      method: 'POST',
      body: { signedXdr },
    });
  } catch (err) {
    await releaseClaim(pending.id); // let the user retry the same signed XDR
    throw err;
  }

  const contractId = pending.contract_id ?? twResult.contractId ?? twResult.escrow?.contractId ?? null;
  await applySubmittedAction(pending, { txHash, contractId, twResult });

  return res.status(200).json({
    txHash,
    status: 'submitted',
    action: pending.action,
    engagementId: pending.engagement_id,
    contractId,
  });
});

function replayBody(row: { status: string; action: string; engagement_id: string; contract_id: string | null }, txHash: string) {
  return {
    txHash,
    status: row.status,
    action: row.action,
    engagementId: row.engagement_id,
    contractId: row.contract_id,
    replay: true,
  };
}
