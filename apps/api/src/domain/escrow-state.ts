/*
 * Escrow lifecycle state machine.
 *
 * Mirrors public.escrow_status_transitions (see the canonical
 * escrow-transition matrix migration) so the same rules apply in the
 * application and in the database triggers. The parity test
 * (escrow-transitions-parity.test.ts) reads the migration SQL and
 * asserts the pairs match this map.
 */

export type EscrowStatus =
  | 'deploying'
  | 'pending_signature'
  | 'created'
  | 'funded'
  | 'milestone_approved'
  | 'completed'
  | 'disputed'
  | 'resolved'
  | 'cancelled';

/**
 * Canonical transition matrix (single-release).
 *
 * Happy path: deploying -> pending_signature -> created -> funded
 *           -> milestone_approved -> completed.
 * Dispute path: funded | milestone_approved -> disputed -> resolved
 *               -> completed.
 *
 * A missed fund and approval must be replayed step by step by the
 * reconciler (see pathTo), not jumped over.
 */
export const ESCROW_TRANSITIONS: Record<EscrowStatus, readonly EscrowStatus[]> = {
  deploying: ['pending_signature'],
  pending_signature: ['created', 'cancelled'],
  created: ['funded', 'cancelled'],
  funded: ['milestone_approved', 'disputed', 'cancelled'],
  milestone_approved: ['completed', 'disputed'],
  disputed: ['resolved'],
  resolved: ['completed'],
  completed: [],
  cancelled: [],
};

/** Backwards-compatible alias for the transition matrix. */
export const TRANSITIONS: Record<EscrowStatus, readonly EscrowStatus[]> = ESCROW_TRANSITIONS;

/** Thrown when a status change is not allowed by the transition table. */
export class InvalidTransitionError extends Error {
  readonly from: string;
  readonly to: string | undefined;

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
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ESCROW_TRANSITIONS, value);
}

/** Returns true when `from -> to` is an allowed transition. */
export function canTransition(from: string, to: string): boolean {
  if (!isEscrowStatus(from) || !isEscrowStatus(to)) {
    return false;
  }
  return ESCROW_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: EscrowStatus, to: EscrowStatus): void {
  if (!ESCROW_TRANSITIONS[from].includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

/** Same as assertTransition but tolerates raw (possibly unknown) status strings from the DB. */
export function assertStatusTransition(from: string, to: EscrowStatus): void {
  if (!isEscrowStatus(from) || !ESCROW_TRANSITIONS[from].includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

/**
 * Computes the steps needed to get from `from` to `to` using only legal
 * transitions. Returns the intermediate states including `to` but excluding
 * `from`. Throws InvalidTransitionError when no path exists.
 */
export function pathTo(from: EscrowStatus, to: EscrowStatus): EscrowStatus[] {
  if (from === to) {
    return [];
  }
  if (!isEscrowStatus(from) || !isEscrowStatus(to)) {
    throw new InvalidTransitionError(from, to);
  }

  // Breadth-first search over the directed graph.
  const queue: EscrowStatus[] = [from];
  const prev = new Map<EscrowStatus, EscrowStatus | null>([[from, null]]);


  while (queue.length > 0) {
    const current = queue.shift() as EscrowStatus;
    if (current === to) {
      break;
    }
    for (const next of ESCROW_TRANSITIONS[current]) {
      if (!prev.has(next)) {
        prev.set(next, current);
        queue.push(next);
      }
    }
  }

  if (!prev.has(to)) {
    throw new InvalidTransitionError(from, to);
  }

  const path: EscrowStatus[] = [];
  let cursor: EscrowStatus | null = to;
  while (cursor != null && cursor !== from) {
    path.unshift(cursor);
    cursor = prev.get(cursor) ?? null;
  }
  return path;
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
