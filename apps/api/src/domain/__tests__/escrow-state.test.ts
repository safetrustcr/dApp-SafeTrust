import { describe, expect, it } from 'vitest';
import {
  TRANSITIONS,
  assertTransition,
  canTransition,
  transitionSources,
  ConcurrentTransitionError,
  InvalidTransitionError,
  type EscrowStatus,
} from '../escrow-state.js';

describe('escrow-state', () => {
  it('encodes the exact transition table', () => {
    expect(TRANSITIONS).toEqual({
      created: ['funded'],
      funded: ['milestone_approved', 'disputed'],
      milestone_approved: ['completed', 'disputed'],
      disputed: ['resolved'],
      completed: [],
      resolved: [],
    });
  });

  it('accepts every documented transition', () => {
    (Object.keys(TRANSITIONS) as EscrowStatus[]).forEach((from) => {
      TRANSITIONS[from].forEach((to) => {
        expect(() => assertTransition(from, to)).not.toThrow();
        expect(canTransition(from, to)).toBe(true);
      });
    });
  });

  it('rejects created -> completed (invalid transition)', () => {
    expect(() => assertTransition('created', 'completed')).toThrow(InvalidTransitionError);
    expect(canTransition('created', 'completed')).toBe(false);
  });

  it('rejects any transition out of a terminal state', () => {
    expect(() => assertTransition('completed', 'funded')).toThrow(InvalidTransitionError);
    expect(() => assertTransition('resolved', 'disputed')).toThrow(InvalidTransitionError);
  });

  it('renders the invalid transition in the error message', () => {
    try {
      assertTransition('created', 'completed');
      throw new Error('expected assertTransition to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      expect((error as Error).message).toBe('invalid escrow transition created -> completed');
    }
  });

  it('lists every source that may enter a status', () => {
    expect(transitionSources('funded')).toEqual(['created']);
    expect(transitionSources('disputed')).toEqual(['funded', 'milestone_approved']);
    expect(transitionSources('completed')).toEqual(['milestone_approved']);
    expect(transitionSources('resolved')).toEqual(['disputed']);
  });

  it('exposes a conflict error carrying from/to/contractId', () => {
    const error = new ConcurrentTransitionError('created', 'funded', 'CAZT001');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ConcurrentTransitionError');
    expect(error.from).toBe('created');
    expect(error.to).toBe('funded');
    expect(error.contractId).toBe('CAZT001');
  });
});
