/**
 * Escrow lifecycle state machine.
 *
 * The status names match the ones already persisted by the API and enforced by
 * the database triggers created in
 * `infra/backend/migrations/safetrust/1790000000000_escrow_state_machine`.
 * Keeping the table here means route handlers and the DB layer can reject an
 * invalid transition *before* issuing a write, instead of relying on a Hasura
 * `check_violation` to come back.
 */

export type EscrowStatus =
  | 'created'
  | 'funded'
  | 'milestone_approved'
  | 'completed'
  | 'disputed'
  | 'resolved';

export const TRANSITIONS: Record<EscrowStatus, readonly EscrowStatus[]> = {
  created: ['funded'],
  funded: ['milestone_approved', 'disputed'],
  milestone_approved: ['completed', 'disputed'],
  disputed: ['resolved'],
  completed: [],
  resolved: [],
};

const ALL_STATUSES = Object.keys(TRANSITIONS) as EscrowStatus[];

/** Thrown when a caller asks for a transition the state machine forbids. */
export class InvalidTransitionError extends Error {
  constructor(
    readonly from: EscrowStatus,
    readonly to: EscrowStatus,
  ) {
    super(`invalid escrow transition ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

/**
 * Thrown when a conditional update matched zero rows: another request already
 * moved the escrow (or it was never in the expected `from` state). The API maps
 * this to HTTP 409.
 */
export class ConcurrentTransitionError extends Error {
  constructor(
    readonly from: string,
    readonly to: string,
    readonly contractId?: string,
  ) {
    const scope = contractId ? ` for contract ${contractId}` : '';
    super(`escrow${scope} is not in '${from}'; refusing transition to '${to}'`);
    this.name = 'ConcurrentTransitionError';
  }
}

/** True when `to` is a legal successor of `from`. */
export function canTransition(from: EscrowStatus, to: EscrowStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Every status that may transition to `to`. */
export function transitionSources(to: EscrowStatus): EscrowStatus[] {
  return ALL_STATUSES.filter((from) => TRANSITIONS[from].includes(to));
}

export function assertTransition(from: EscrowStatus, to: EscrowStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}
