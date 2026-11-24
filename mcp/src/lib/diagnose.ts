/**
 * Plain-language diagnosis of one escrow, from a snapshot of the data apps/api
 * keeps about it. Pure: tools/escrow-diagnostics.ts gathers the snapshot, this
 * file only reasons about it, so every case is unit-testable.
 */
import type { ChainStatus } from './horizon.js';
import type { EscrowRow, PendingActionRow, TransitionRow } from './escrow-data.js';
import { shortHash } from './redact.js';

/**
 * Status an escrow reaches once each action is confirmed — the same table the
 * reconciler applies (apps/api services/escrow-reconcile.ts TRANSITION_MAP).
 * mark_milestone_completed moves the milestone, not the escrow.
 */
export const ACTION_TARGET_STATUS: Readonly<Record<string, string>> = {
  initialize: 'created',
  fund: 'funded',
  approve_milestone: 'milestone_approved',
  release_funds: 'completed',
  resolve_dispute: 'resolved',
};

/** Ordering used to tell "already past this step" from "behind". */
const STATUS_RANK: Readonly<Record<string, number>> = {
  deploying: -2,
  pending_signature: -1,
  created: 0,
  pending_funding: 0,
  funded: 1,
  active: 1,
  disputed: 1,
  milestone_approved: 2,
  completed: 3,
  resolved: 4,
  cancelled: 5,
};

/** What the next human step is once an escrow sits cleanly in a status. */
const NEXT_STEP_FOR_STATUS: Readonly<Record<string, string>> = {
  pending_signature:
    'The guest signs the initialize transaction in their wallet; the frontend submits it (POST /api/escrow/send-transaction).',
  created: 'Fund it: the guest builds the fund transaction (POST /api/escrow/fund, or the fund-escrow tool) and signs it.',
  pending_funding: 'Fund it: the guest builds the fund transaction (POST /api/escrow/fund) and signs it.',
  funded: 'The host marks the milestone complete (POST /api/escrow/milestone-status) and signs it.',
  active: 'The host marks the milestone complete (POST /api/escrow/milestone-status) and signs it.',
  milestone_approved: 'The guest releases the funds (POST /api/escrow/release-funds) and signs it.',
  disputed: 'The platform resolves the dispute (POST /api/escrow/resolve-dispute, admin + platform wallet).',
  completed: 'Nothing: the escrow is complete.',
  resolved: 'Nothing: the dispute is resolved.',
  cancelled: 'Nothing: the escrow is cancelled.',
};

/** The reconciler waits this long before checking a submitted transaction. */
export const RECONCILER_GRACE_MS = 30_000;
/** After this, a submitted transaction Horizon has never seen is considered lost. */
export const SUBMISSION_LOST_AFTER_MS = 10 * 60_000;

export type DiagnosisSnapshot = {
  engagementId: string;
  escrow: EscrowRow | null;
  /** Newest first. */
  pendingActions: PendingActionRow[];
  /** Newest first. */
  transitions: TransitionRow[];
  twMirrorStatus: string | null;
  /** Horizon result for each submitted/confirmed pending action, by tx hash. */
  chain: Record<string, { status: ChainStatus; ledgerClosedAt?: string }>;
  lastReconcilerWrite: { created_at: string; engagement_id: string | null } | null;
  now: Date;
};

export type DiagnosisState =
  | 'no-escrow'
  | 'built-unsigned'
  | 'build-expired'
  | 'submitted-awaiting-confirmation'
  | 'submitted-lost'
  | 'confirmed-not-synced'
  | 'failed-on-chain'
  | 'synced';

export type Diagnosis = {
  state: DiagnosisState;
  summary: string;
  nextStep: string;
  details: string[];
};

const at = (iso: string | null | undefined) => (iso ? new Date(iso).toISOString().replace('.000Z', 'Z') : 'unknown');

function reachedOrPassed(status: string | undefined, target: string | undefined): boolean {
  if (!status || !target) return false;
  return (STATUS_RANK[status] ?? -99) >= (STATUS_RANK[target] ?? 99);
}

function reconcilerLine(snapshot: DiagnosisSnapshot): string {
  const last = snapshot.lastReconcilerWrite;
  return last
    ? `the reconciler last corrected an escrow at ${at(last.created_at)}${
        last.engagement_id === snapshot.engagementId ? ' (this one)' : ''
      }`
    : 'the reconciler has never corrected an escrow on this database';
}

export function diagnose(snapshot: DiagnosisSnapshot): Diagnosis {
  const { escrow, pendingActions, transitions, now } = snapshot;
  const details: string[] = [];

  if (escrow) {
    details.push(`DB status: ${escrow.status} (updated ${at(escrow.updated_at)})`);
    if (escrow.contract_id && escrow.contract_id !== escrow.engagement_id) details.push(`contract: ${escrow.contract_id}`);
  }
  if (snapshot.twMirrorStatus) details.push(`Trustless Work mirror (DB): ${snapshot.twMirrorStatus}`);
  const lastTransition = transitions[0];
  if (lastTransition) {
    details.push(
      `last transition: ${lastTransition.from_status ?? '∅'} → ${lastTransition.to_status ?? '∅'} ` +
        `(${lastTransition.action}, ${lastTransition.source}, ${at(lastTransition.created_at)})`,
    );
  }

  if (!escrow && pendingActions.length === 0) {
    return {
      state: 'no-escrow',
      summary: `No escrow and no built transaction for ${snapshot.engagementId}.`,
      nextStep:
        'Deploy it: POST /api/escrow/deploy with apartmentId or reservationId and the guest wallet ' +
        '(the deploy-escrow tool). Engagement ids are rental:<apartmentId>:<guestUid> or hotel:<reservationId>.',
      details,
    };
  }

  // The most recent action that is still in play decides the story.
  const live = pendingActions.find((row) => row.status !== 'expired' && row.status !== 'failed') ?? pendingActions[0];

  if (live && live.status === 'built') {
    const expired = new Date(live.expires_at).getTime() <= now.getTime();
    if (expired) {
      return {
        state: 'build-expired',
        summary: `The ${live.action} transaction (tx ${shortHash(live.tx_hash)}) was built at ${at(live.created_at)} and expired unsigned at ${at(live.expires_at)}.`,
        nextStep: `Rebuild it: call the ${live.action} build route again (it reuses nothing expired) and sign within the time window.`,
        details,
      };
    }
    return {
      state: 'built-unsigned',
      summary: `Built, not signed: the ${live.action} transaction (tx ${shortHash(live.tx_hash)}) was built at ${at(live.created_at)} for wallet ${live.signer_address.slice(0, 4)}…${live.signer_address.slice(-4)} and expires at ${at(live.expires_at)}.`,
      nextStep:
        'The signer opens the booking in the browser, signs with their wallet, and the frontend submits it ' +
        '(POST /api/escrow/send-transaction). The MCP cannot sign or submit.',
      details,
    };
  }

  if (live && (live.status === 'submitted' || live.status === 'confirmed')) {
    const target = ACTION_TARGET_STATUS[live.action];
    const chain = snapshot.chain[live.tx_hash] ?? { status: 'unknown' as ChainStatus };
    const synced = target ? reachedOrPassed(escrow?.status, target) : live.status === 'confirmed';
    details.push(`${live.action} tx ${live.tx_hash}: pending action ${live.status}, Horizon ${chain.status}`);

    if (chain.status === 'success' && synced) {
      return {
        state: 'synced',
        summary: `Confirmed and synced: ${live.action} landed on chain (tx ${shortHash(live.tx_hash)}${
          chain.ledgerClosedAt ? `, ${at(chain.ledgerClosedAt)}` : ''
        }) and the DB status is ${escrow?.status ?? 'unknown'}.`,
        nextStep: NEXT_STEP_FOR_STATUS[escrow?.status ?? ''] ?? 'Check get-escrow-status for the current step.',
        details,
      };
    }
    if (chain.status === 'success') {
      return {
        state: 'confirmed-not-synced',
        summary: `${live.action === 'fund' ? 'Funded' : 'Confirmed'} on chain but not in the DB: ${live.action} landed (tx ${shortHash(live.tx_hash)}${
          chain.ledgerClosedAt ? `, ${at(chain.ledgerClosedAt)}` : ''
        }), the DB is still ${escrow?.status ?? 'missing'} (expected ${target ?? 'a later status'}), and ${reconcilerLine(snapshot)}.`,
        nextStep:
          'Run the reconciler: POST /reconciliation/sync-escrows with the x-reconciliation-secret header ' +
          '(or wait for its cron). It applies confirmed transactions it finds in escrow_transactions.',
        details,
      };
    }
    if (chain.status === 'failed') {
      return {
        state: 'failed-on-chain',
        summary: `The ${live.action} transaction (tx ${shortHash(live.tx_hash)}) was submitted but failed on chain; the DB is ${escrow?.status ?? 'missing'}.`,
        nextStep:
          'Rebuild and sign again. apps/api answers ACTION_IN_FLIGHT while this pending action is still ' +
          `"${live.status}", and nothing in apps/api moves a failed submission out of that state today — ask a maintainer to clear it.`,
        details,
      };
    }
    const submittedAt = live.submitted_at ?? live.created_at;
    const age = now.getTime() - new Date(submittedAt).getTime();
    if (chain.status === 'not_found' && age > SUBMISSION_LOST_AFTER_MS) {
      return {
        state: 'submitted-lost',
        summary: `Submitted at ${at(submittedAt)}, but Horizon has no transaction ${shortHash(live.tx_hash)} ${Math.round(age / 60_000)} minutes later; the DB is ${escrow?.status ?? 'missing'}.`,
        nextStep:
          'The submission most likely never reached the network (or the transaction expired). Check apps/api logs for ' +
          'send-transaction, then rebuild and sign again; a maintainer may need to clear the "submitted" pending action.',
        details,
      };
    }
    return {
      state: 'submitted-awaiting-confirmation',
      summary: `Submitted, not confirmed yet: ${live.action} tx ${shortHash(live.tx_hash)} was submitted at ${at(submittedAt)}; Horizon ${
        chain.status === 'not_found' ? 'has no record of it yet' : 'could not be checked'
      } and the DB is ${escrow?.status ?? 'missing'}.`,
      nextStep:
        age < RECONCILER_GRACE_MS
          ? 'Wait: confirmation normally takes a few seconds, and the reconciler checks submissions after 30 s.'
          : 'Wait a little longer, then run diagnose-escrow again. If Horizon still has no record after 10 minutes, treat the submission as lost.',
      details,
    };
  }

  // No live pending action: the escrow row is the whole story.
  const status = escrow?.status ?? 'unknown';
  return {
    state: 'synced',
    summary: `No transaction in flight; the escrow is ${status}${lastTransition ? ` since ${at(lastTransition.created_at)}` : ''}.`,
    nextStep: NEXT_STEP_FOR_STATUS[status] ?? 'Check get-escrow-status for the current step.',
    details,
  };
}
