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
import { syncHotelEscrowTransaction } from '../../services/hotel-reservation-escrow.js';
import { hasuraRequest } from '../../services/hasura.js';
import type { PendingAction } from '../../services/pending-actions.js';
import { setPendingContractId } from '../../services/pending-actions.js';
import {
  dbApproveMilestone,
  dbFundEscrow,
  dbInitializeEscrow,
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

  if (contractId && pending.contract_id !== contractId) {
    await setPendingContractId(pending.id, contractId);
  }
  if (!contractId) return; // initialize without a contract id yet: reconciliation picks it up

  switch (pending.action) {
    case 'initialize':
      await dbInitializeEscrow({
        contractId,
        engagementId: pending.engagement_id,
        apartmentId: typeof p.apartmentId === 'string' ? p.apartmentId : undefined,
        tenantId: typeof p.tenantId === 'string' ? p.tenantId : 'safetrust',
        booking: p.booking as import('../../services/hotel-reservation-escrow.js').HotelReservation | undefined,
        senderAddress: pending.signer_address,
        receiverAddress: String(p.receiverAddress),
        releaser: String(p.releaser),
        amount: Number(p.amount),
      });
      break;
    case 'fund':
      await dbFundEscrow(contractId, Number(p.amount));
      // Mark hotel reservation as confirmed when escrow is funded
      if (pending.engagement_id.startsWith('hotel:')) {
        const reservationId = pending.engagement_id.slice('hotel:'.length);
        await hasuraRequest(
          `mutation ConfirmReservation($reservationId: uuid!) {
            update_reservations_by_pk(pk_columns: { id: $reservationId }, _set: { reservation_status: "CONFIRMED" }) { id }
          }`, { reservationId },
        );
      }
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
  if (pending.engagement_id.startsWith('hotel:')) {
    const status = { initialize: 'created', fund: 'funded', mark_milestone_completed: 'funded', approve_milestone: 'milestone_approved', release_funds: 'completed', resolve_dispute: 'resolved' }[pending.action];
    await syncHotelEscrowTransaction(pending.engagement_id.slice('hotel:'.length), contractId, pending.signer_address, status);
  }
}
