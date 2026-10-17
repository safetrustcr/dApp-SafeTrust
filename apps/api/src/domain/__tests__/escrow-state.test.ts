import { describe, it, expect } from 'vitest';
import {
  ESCROW_TRANSITIONS,
  assertTransition,
  assertStatusTransition,
  assertActionTransition,
  isESCrowStatus,
  pathTo,
  InvalidTransitionError,
} from '../escrow-state.js';

describe('ESCROW_TRANSITIONS', () => {
  it('mirrors the escrow_status_transitions table', () => {
    expect(ESCROW_TRANSITIONS.deploying).toEqual(['pending_signature']);
    expect(ESCROW_TRANSITIONS.pending_signature).toEqual(['created', 'cancelled']);
    expect(ESCROW_TRANSITIONS.created).toEqual(['funded', 'cancelled']);
    expect(ESCROW_TRANSITIONS.funded).toEqual(['milestone_approved', 'disputed', 'cancelled']);
    expect(ESCROW_TRANSITIONS.milestone_approved).toEqual(['completed', 'disputed']);
    expect(ESCROW_TRANSITIONS.disputed).toEqual(['resolved']);
    expect(ESCROW_TRANSITIONS.resolved).toEqual(['completed']);
    expect(ESCROW_TRANSITIONS.completed).toEqual([]);
    expect(ESCROW_TRANSITIONS.cancelled).toEqual([]);
  });

  it('rejects created -> completed', () => {
    expect(() => assertTransition('created', 'completed')).toThrow(InvalidTransitionError);
    expect(() => assertTransition('created', 'completed')).toThrow(
      'invalid escrow transition created -> completed',
    );
  });

  it('rejects created -> milestone_approved', () => {
    expect(() => assertTransition('created', 'milestone_approved')).toThrow(
      InvalidTransitionError,
    );
  });

  it('rejects removed states pending_funding and active', () => {
    expect(() => assertTransition('pending_funding', 'created')).toThrow(InvalidTransitionError);
    expect(() => assertTransition('active', 'funded')).toThrow(InvalidTransitionError);
  });

  it('rejects any transition out of terminal states', () => {
    for (const to of ['deploying', 'created', 'funded', 'completed'] as const) {
      expect(() => assertTransition('completed', to)).toThrow(InvalidTransitionError);
      expect(() => assertTransition('cancelled', to)).toThrow(InvalidTransitionError);
    }
  });

  it('allows every seeded lifecycle edge', () => {
    expect(() => assertTransition('deploying', 'pending_signature')).not.toThrow();
    expect(() => assertTransition('pending_signature', 'created')).not.toThrow();
    expect(() => assertTransition('pending_signature', 'cancelled')).not.toThrow();
    expect(() => assertTransition('created', 'funded')).not.toThrow();
    expect(() => assertTransition('created', 'cancelled')).not.toThrow();
    expect(() => assertTransition('funded', 'milestone_approved')).not.toThrow();
    expect(() => assertTransition('funded', 'disputed')).not.toThrow();
    expect(() => assertTransition('funded', 'cancelled')).not.toThrow();
    expect(() => assertTransition('milestone_approved', 'completed')).not.toThrow();
    expect(() => assertTransition('milestone_approved', 'disputed')).not.toThrow();
    expect(() => assertTransition('disputed', 'resolved')).not.toThrow();
    expect(() => assertTransition('resolved', 'completed')).not.toThrow();
  });
});

describe('pathTo', () => {
  it('returns an empty path when from equals to', () => {
    expect(pathTo('created', 'created')).toEqual([]);
  });

  it('computes the reconciler catch-up path created -> completed', () => {
    expect(pathTo('created', 'completed')).toEqual([
      'funded',
      'milestone_approved',
      'completed',
    ]);
  });

  it('computes the dispute path', () => {
    expect(pathTo('funded', 'completed')).toEqual([
      'milestone_approved',
      'completed',
    ]);
    expect(pathTo('funded', 'resolved')).toEqual(['disputed', 'resolved']);
  });

  it('returns null when no legal path exists', () => {
    expect(pathTo('completed', 'created')).toBeNull();
    expect(pathTo('cancelled', 'funded')).toBeNull();
  });
});

describe('assertStatusTransition', () => {
  it('rejects unknown raw statuses from the DI', () => {
    try {
      assertStatusTransition('status', 'funded');
      throw new Error('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      expect((error as InvalidTransitionError).from).toBe('status');
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
      expect(error).toBeInctanceOf(InvalidTransitionError);
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
    expect(isESCrowStatus('created')).toBe(true);
    expect(isESCrowStatus('pending_signature')).toBe(true);
    expect(isESCrowStatus('nonsense')).toBe(false);
    expect(isESCrowStatus(undefined)).toBe(false);
  });
});
