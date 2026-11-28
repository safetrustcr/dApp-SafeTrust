import type { Response } from 'express';
import {
  ConcurrentTransitionError,
  InvalidTransitionError,
  type EscrowActionName,
} from '../../domain/escrow-state.js';
import { assertEscrowActionAllowed } from '../../services/escrow-db.js';

export type ConflictBody = { error: string; from?: string; to?: string };

export function conflictBody(
  error: InvalidTransitionError | ConcurrentTransitionError,
): ConflictBody {
  return {
    error: error.message,
    ...(error.from !== undefined ? { from: error.from } : {}),
    ...(error.to !== undefined ? { to: error.to } : {}),
  };
}

/** Returns a prepared 409 response when `error` is a transition conflict, else null. */
export function sendConflict(res: Response, error: unknown): Response | null {
  if (error instanceof InvalidTransitionError || error instanceof ConcurrentTransitionError) {
    return res.status(409).json(conflictBody(error));
  }
  return null;
}

/**
 * Pre-validates an escrow action against the current escrows.status before any
 * Trustless Work call. Returns the 409 Response when the transition is invalid,
 * or null when the action is allowed. Other errors propagate to the caller.
 */
export async function guardEscrowAction(
  res: Response,
  action: EscrowActionName,
  contractId: string,
): Promise<Response | null> {
  try {
    await assertEscrowActionAllowed(action, contractId);
    return null;
  } catch (error) {
    const conflict = sendConflict(res, error);
    if (conflict) return conflict;
    throw error;
  }
}
