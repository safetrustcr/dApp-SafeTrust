/**
 * Effects that run after Trustless Work accepted a signed transaction.
 *
 * ⚠️ ADAPTER — reconcile with your current send-transaction.handler.ts before merging.
 * Move the existing post-submit block (dbInitializeEscrow / dbFundEscrow /
 * transition calls / syncEscrow …) into the switch below, and replace every
 * `req.body.X` with the server-derived value from `pending` / `pending.payload`.
 * The browser no longer sends action, amount, approver, releaseSigner or status.
 *
 * If your reconciliation (escrow-reconcile.ts + stellar-confirm.ts) already moves
 * status forward only after ledger confirmation, call it here instead of writing
 * status directly.
 */
import type { PendingAction } from '../../services/pending-actions.js';
import { setPendingContractId } from '../../services/pending-actions.js';
import {
  dbApproveMilestone,
  dbFundEscrow,
  dbMarkMilestoneCompleted,
  dbReleaseFunds,
  dbResolveDispute,
} from '../../services/escrow-db.js';

export type SubmitContext = {
  txHash: string;
  contractId: string | null;
  twResult: unknown;
};

export async function applySubmittedAction(pending: PendingAction, ctx: SubmitContext): Promise<void> {
  const p = pending.payload as Record<string, unknown>;
  const contractId = ctx.contractId;

  if (contractId && !pending.contract_id) {
    await setPendingContractId(pending.id, contractId);
  }
  if (!contractId) return; // initialize without a contract id yet: reconciliation picks it up

  switch (pending.action) {
    case 'initialize':
      // Existing initialize block goes here (dbInitializeEscrow + escrow record),
      // using pending.engagement_id, pending.signer_address and p.receiverAddress / p.amount / p.apartmentId.
      break;
    case 'fund':
      await dbFundEscrow(contractId, Number(p.amount));
      break;
    case 'mark_milestone_completed':
      await dbMarkMilestoneCompleted(contractId, String(p.milestoneId));
      break;
    case 'approve_milestone':
      await dbApproveMilestone(contractId, String(p.milestoneId), String(p.approver));
      break;
    case 'release_funds':
      await dbReleaseFunds(contractId, String(p.releaseSigner));
      break;
    case 'resolve_dispute':
      await dbResolveDispute(contractId);
      break;
  }
}
