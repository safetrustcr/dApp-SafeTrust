/**
 * Escrow lifecycle state machine.
 *
 * Mirrors public.escrow_status_transitions (migrations
 * 1790000000000_escrow_state_machine + 1791000000001_escrow_transition_hardening)
 * so the same rules apply in the application and in the database triggers.
 */

export type EscrowStatus =
  | 'pending_signature'
  | 'created'
  | 'funded'
  | 'milestone_approved'
  | 'completed'
  | 'disputed'
  | 'resolved'
  | 'deploying'
  | 'cancelled';

export const TRANSITIONS: Record<EscrowStatus, readonly EscrowStatus[]> = {
  pending_signature: ['created'],
  created: ['funded'],
  funded: ['milestone_approved', 'disputed'],
  milestone_approved: ['completed', 'disputed'],
  disputed: ['resolved'],
  completed: [],
  resolved: [],
  deploying: [],
  cancelled: [],
};

/** Thrown when a status change is not allowed by the transition table. */
export class InvalidTransitionError extends Error {
  readonly from: string;
  readonly to?: string;

  constructor(from: string, to?: string, action?: string) {
    super(
      to != null
        ? `invalid escrow transition ${from} -> ${to}`
        : `escrow status ${from} does not allow ${action ?? 'this action'}`,
    );
    this.name = 'InvalidTransitionError';
    this.from = from;
    this.to = to;
  }
}

/**
 * Thrown when a conditional update matched no rows — someone else moved the
 * escrow first, or it is in the wrong state. Kept on the legacy
 * 'Escrow changed. Refresh and retry' message so existing string-based
 * guards (isEscrowChangedError) keep working as a fallback.
 */
export class ConcurrentTransitionError extends Error {
  readonly from?: string;
  readonly to?: string;

  constructor(from?: string, to?: string) {
    super('Escrow changed. Refresh and retry');
    this.name = 'ConcurrentTransitionError';
    this.from = from;
    this.to = to;
  }
}

export function isEscrowStatus(value: unknown): value is EscrowStatus {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(TRANSITIONS, value);
}

export function assertTransition(from: EscrowStatus, to: EscrowStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

/** Same as assertTransition but tolerates raw (possibly unknown) status strings from the DB. */
export function assertStatusTransition(from: string, to: EscrowStatus): void {
  if (!isEscrowStatus(from) || !TRANSITIONS[from].includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export type EscrowActionName =
  | 'fund'
  | 'mark_milestone_completed'
  | 'approve_milestone'
  | 'release_funds'
  | 'dispute'
  | 'resolve_dispute';

export type EscrowActionSpec = {
  /** Escrow statuses from which the action may run. */
  from: readonly EscrowStatus[];
  /** Escrow status after the action; null when the escrow status does not change. */
  to: EscrowStatus | null;
};

export const ESCROW_ACTIONS: Record<EscrowActionName, EscrowActionSpec> = {
  fund: { from: ['created'], to: 'funded' },
  mark_milestone_completed: { from: ['funded'], to: null },
  approve_milestone: { from: ['funded'], to: 'milestone_approved' },
  release_funds: { from: ['milestone_approved'], to: 'completed' },
  dispute: { from: ['funded', 'milestone_approved'], to: 'disputed' },
  resolve_dispute: { from: ['disputed'], to: 'resolved' },
};

/**
 * Pre-validates that an escrow action may run from the current status.
 * Throws InvalidTransitionError otherwise. For actions that do not change the
 * escrow status (e.g. mark_milestone_completed) the error carries `from` only.
 */
export function assertActionTransition(action: EscrowActionName, currentStatus: string): void {
  const spec = ESCROW_ACTIONS[action];
  if (!spec) {
    throw new InvalidTransitionError(currentStatus, undefined, action);
  }
  if (!isEscrowStatus(currentStatus) || !spec.from.includes(currentStatus)) {
    if (spec.to != null) {
      throw new InvalidTransitionError(currentStatus, spec.to, action);
    }
    throw new InvalidTransitionError(currentStatus, undefined, `${action} (expected: ${spec.from.join(', ')})`);
  }
}
