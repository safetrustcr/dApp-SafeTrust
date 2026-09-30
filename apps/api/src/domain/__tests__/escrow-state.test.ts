import { describe, it, expect } from 'vitest';
import {
  TRANSITIONS,
  assertTransition,
  assertStatusTransition,
  assertActionTransition,
  isEscrowStatus,
  InvalidTransitionError,
} from '../escrow-state.js';

describe('TRANSITIONS', () => {
  it('mirrors the escrow_status_transitions table', () => {
    expect(TRANSITIONS.pending_signature).toEqual(['created']);
    expect(TRANSITIONS.created).toEqual(['funded']);
    expect(TRANSITIONS.funded).toEqual(['milestone_approved', 'disputed']);
    expect(TRANSITIONS.milestone_approved).toEqual(['completed', 'disputed']);
    expect(TRANSITIONS.disputed).toEqual(['resolved']);
    expect(TRANSITIONS.completed).toEqual([]);
    expect(TRANSITIONS.resolved).toEqual([]);
  });

  it('rejects created -> completed', () => {
    expect(() => assertTransition('created', 'completed')).toThrow(InvalidTransitionError);
    expect(() => assertTransition('created', 'completed')).toThrow(
      'invalid escrow transition created -> completed',
    );
  });

  it('rejects any transition out of terminal states', () => {
    for (const to of ['created', 'funded', 'completed', 'resolved'] as const) {
      expect(() => assertTransition('completed', to)).toThrow(InvalidTransitionError);
      expect(() => assertTransition('resolved', to)).toThrow(InvalidTransitionError);
    }
  });

  it('allows every seeded lifecycle edge', () => {
    expect(() => assertTransition('pending_signature', 'created')).not.toThrow();
    expect(() => assertTransition('created', 'funded')).not.toThrow();
    expect(() => assertTransition('funded', 'milestone_approved')).not.toThrow();
    expect(() => assertTransition('funded', 'disputed')).not.toThrow();
    expect(() => assertTransition('milestone_approved', 'completed')).not.toThrow();
    expect(() => assertTransition('milestone_approved', 'disputed')).not.toThrow();
    expect(() => assertTransition('disputed', 'resolved')).not.toThrow();
  });
});

describe('assertStatusTransition', () => {
  it('rejects unknown raw statuses from the DB', () => {
    try {
      assertStatusTransition('weird_status', 'funded');
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      expect((error as InvalidTransitionError).from).toBe('weird_status');
      expect((error as InvalidTransitionError).to).toBe('funded');
    }
  });
});

describe('assertActionTransition', () => {
  it('accepts fund only from created', () => {
    expect(() => assertActionTransition('fund', 'created')).not.toThrow();
    expect(() => assertActionTransition('fund', 'completed')).toThrow(InvalidTransitionError);
  });

  it('accepts release_funds only from milestone_approved', () => {
    expect(() => assertActionTransition('release_funds', 'milestone_approved')).not.toThrow();
    expect(() => assertActionTransition('release_funds', 'completed')).toThrow(
      'invalid escrow transition completed -> completed',
    );
    expect(() => assertActionTransition('release_funds', 'funded')).toThrow(InvalidTransitionError);
  });

  it('reports from/to for actions with an escrow status change', () => {
    try {
      assertActionTransition('approve_milestone', 'completed');
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      expect((error as InvalidTransitionError).from).toBe('completed');
      expect((error as InvalidTransitionError).to).toBe('milestone_approved');
    }
  });

  it('reports the expected states for guard-only actions (no escrow change)', () => {
    try {
      assertActionTransition('mark_milestone_completed', 'completed');
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      expect((error as InvalidTransitionError).message).toContain('does not allow');
      expect((error as InvalidTransitionError).message).toContain('expected: funded');
    }
    expect(() => assertActionTransition('mark_milestone_completed', 'funded')).not.toThrow();
  });

  it('accepts dispute from funded and milestone_approved only', () => {
    expect(() => assertActionTransition('dispute', 'funded')).not.toThrow();
    expect(() => assertActionTransition('dispute', 'milestone_approved')).not.toThrow();
    expect(() => assertActionTransition('dispute', 'disputed')).toThrow(InvalidTransitionError);
  });
});

describe('isEscrowStatus', () => {
  it('recognizes known statuses only', () => {
    expect(isEscrowStatus('created')).toBe(true);
    expect(isEscrowStatus('pending_signature')).toBe(true);
    expect(isEscrowStatus('nonsense')).toBe(false);
    expect(isEscrowStatus(undefined)).toBe(false);
  });
});
