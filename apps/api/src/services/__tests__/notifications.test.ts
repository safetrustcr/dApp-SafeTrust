import { describe, expect, it } from 'vitest';
import {
  buildNotifications,
  clampLimit,
  derivePendingActions,
  mapLifecycleMessage,
  splitEventBody,
  type ActionableEscrow,
  type LifecycleMessageRow,
} from '../notifications.js';
import { actionableEscrowsWhere } from '../notifications-db.js';

const GUEST = 'GGUEST';
const HOST = 'GHOST';
const PLATFORM = 'GPLATFORM';

function escrow(status: string, overrides: Partial<ActionableEscrow> = {}): ActionableEscrow {
  return {
    id: 'escrow-1',
    engagement_id: 'eng-1',
    contract_id: 'CONTRACT1',
    sender_address: GUEST,
    receiver_address: HOST,
    amount: '100',
    status,
    created_at: '2026-11-01T10:00:00.000Z',
    updated_at: '2026-11-02T10:00:00.000Z',
    apartment_id: 'apt-1',
    apartment: { name: 'Casa Azul' },
    ...overrides,
  };
}

function message(overrides: Partial<LifecycleMessageRow> = {}): LifecycleMessageRow {
  return {
    id: 'm1',
    event_type: 'escrow_funded',
    body: 'Deposit of 100 USDC is locked in escrow on Stellar Testnet.\nhttps://stellar.expert/explorer/testnet/tx/abc123',
    created_at: '2026-11-03T10:00:00.000Z',
    conversation: {
      id: 'c1',
      escrow_id: 'escrow-1',
      apartment_id: 'apt-1',
      host_id: 'host-uid',
      guest_id: 'guest-uid',
      host_last_read_at: null,
      guest_last_read_at: null,
    },
    ...overrides,
  };
}

const opts = (milestoneCompleted = false) => ({ milestoneCompleted, platformAddress: PLATFORM });

describe('derivePendingActions (status x role)', () => {
  it('asks the guest to fund a created escrow, and nobody else', () => {
    expect(derivePendingActions(escrow('created'), [GUEST], opts())).toEqual(['fund']);
    expect(derivePendingActions(escrow('created'), [HOST], opts())).toEqual([]);
    expect(derivePendingActions(escrow('created'), ['GSTRANGER'], opts())).toEqual([]);
  });

  it('funded: the host marks the stay completed, then the guest approves', () => {
    const funded = escrow('funded');
    expect(derivePendingActions(funded, [HOST], opts(false))).toEqual(['mark_milestone_completed']);
    expect(derivePendingActions(funded, [GUEST], opts(false))).toEqual([]);

    expect(derivePendingActions(funded, [HOST], opts(true))).toEqual([]);
    expect(derivePendingActions(funded, [GUEST], opts(true))).toEqual(['approve_milestone']);
  });

  it('milestone_approved: the guest (release signer) releases the funds', () => {
    const approved = escrow('milestone_approved');
    expect(derivePendingActions(approved, [GUEST], opts())).toEqual(['release_funds']);
    expect(derivePendingActions(approved, [HOST], opts())).toEqual([]);
  });

  it('disputed: only the platform wallet resolves', () => {
    const disputed = escrow('disputed');
    expect(derivePendingActions(disputed, [PLATFORM], opts())).toEqual(['resolve_dispute']);
    expect(derivePendingActions(disputed, [GUEST], opts())).toEqual([]);
    expect(derivePendingActions(disputed, [HOST], opts())).toEqual([]);
  });

  it('offers nothing in terminal or in-flight statuses', () => {
    for (const status of ['completed', 'cancelled', 'resolved', 'deploying', 'pending_signature']) {
      expect(derivePendingActions(escrow(status), [GUEST, HOST, PLATFORM], opts(true))).toEqual([]);
    }
  });

  it('without a configured platform address nobody can resolve, but other actions still work', () => {
    expect(derivePendingActions(escrow('disputed'), [PLATFORM], { milestoneCompleted: false })).toEqual([]);
    expect(derivePendingActions(escrow('created'), [GUEST], { milestoneCompleted: false })).toEqual(['fund']);
  });

  it('a user holding several roles gets each applicable action', () => {
    const both = escrow('funded', { receiver_address: GUEST });
    expect(derivePendingActions(both, [GUEST], opts(false))).toEqual(['mark_milestone_completed']);
    expect(derivePendingActions(both, [GUEST], opts(true))).toEqual(['approve_milestone']);
  });
});

describe('lifecycle events', () => {
  it('maps every stored event type', () => {
    const expected: Record<string, string> = {
      escrow_created: 'milestone',
      escrow_funded: 'payment',
      milestone_completed: 'milestone',
      milestone_approved: 'milestone',
      funds_released: 'payment',
      dispute_opened: 'alert',
      dispute_resolved: 'alert',
    };
    for (const [eventType, type] of Object.entries(expected)) {
      const item = mapLifecycleMessage(message({ event_type: eventType }), 'guest-uid');
      expect(item?.type, eventType).toBe(type);
      expect(item?.kind).toBe('event');
      expect(item?.eventType).toBe(eventType);
    }
  });

  it('keeps the recorded text, splits out the explorer link, and links the conversation and escrow', () => {
    const item = mapLifecycleMessage(message(), 'guest-uid')!;
    expect(item.message).toBe('Deposit of 100 USDC is locked in escrow on Stellar Testnet.');
    expect(item.txUrl).toBe('https://stellar.expert/explorer/testnet/tx/abc123');
    expect(item).toMatchObject({ id: 'event:m1', escrowId: 'escrow-1', apartmentId: 'apt-1', conversationId: 'c1', timestamp: '2026-11-03T10:00:00.000Z' });
    expect(splitEventBody('No link here')).toEqual({ message: 'No link here' });
  });

  it('read state follows the caller\'s own last-read marker', () => {
    const row = message({
      conversation: { ...message().conversation!, guest_last_read_at: '2026-11-04T00:00:00.000Z', host_last_read_at: '2026-11-01T00:00:00.000Z' },
    });
    expect(mapLifecycleMessage(row, 'guest-uid')?.read).toBe(true);
    expect(mapLifecycleMessage(row, 'host-uid')?.read).toBe(false);
    expect(mapLifecycleMessage(message(), 'guest-uid')?.read).toBe(false);
  });

  it('ignores rows that are not lifecycle events', () => {
    expect(mapLifecycleMessage(message({ event_type: null }), 'guest-uid')).toBeNull();
    expect(mapLifecycleMessage(message({ event_type: 'something_else' }), 'guest-uid')).toBeNull();
    expect(mapLifecycleMessage(message({ conversation: null }), 'guest-uid')).toBeNull();
  });
});

describe('buildNotifications', () => {
  const base = { uid: 'guest-uid', wallets: [GUEST], milestoneCompletedEscrowIds: new Set<string>(), platformAddress: PLATFORM };

  it('a user with no escrows and no messages gets no notifications', () => {
    expect(buildNotifications({ ...base, messages: [], escrows: [] })).toEqual([]);
  });

  it('puts pending actions first, then events newest first', () => {
    const items = buildNotifications({
      ...base,
      escrows: [escrow('created')],
      messages: [
        message({ id: 'old', created_at: '2026-11-01T00:00:00.000Z' }),
        message({ id: 'new', created_at: '2026-11-05T00:00:00.000Z', event_type: 'escrow_created' }),
      ],
    });
    expect(items.map((i) => i.id)).toEqual(['action:escrow-1:fund', 'event:new', 'event:old']);
    expect(items[0]).toMatchObject({ kind: 'pending_action', type: 'alert', action: 'fund', read: false, apartmentId: 'apt-1' });
    expect(items[0].message).toContain('Casa Azul');
  });

  it('uses the milestone record to decide between "mark completed" and "approve"', () => {
    const funded = escrow('funded');
    const before = buildNotifications({ ...base, wallets: [HOST], escrows: [funded], messages: [] });
    expect(before.map((i) => i.action)).toEqual(['mark_milestone_completed']);
    const after = buildNotifications({ ...base, escrows: [funded], messages: [], milestoneCompletedEscrowIds: new Set(['escrow-1']) });
    expect(after.map((i) => i.action)).toEqual(['approve_milestone']);
  });

  it('caps events at the limit but never drops a pending action', () => {
    const messages = Array.from({ length: 5 }, (_, i) => message({ id: `m${i}`, created_at: `2026-11-0${i + 1}T00:00:00.000Z` }));
    const items = buildNotifications({ ...base, escrows: [escrow('created'), escrow('milestone_approved', { id: 'escrow-2' })], messages, limit: 2 });
    expect(items.filter((i) => i.kind === 'event')).toHaveLength(2);
    expect(items.filter((i) => i.kind === 'pending_action')).toHaveLength(2);
    expect(items.filter((i) => i.kind === 'event').map((i) => i.id)).toEqual(['event:m4', 'event:m3']);
  });

  it('is deterministic for equal timestamps', () => {
    const rows = ['b', 'a', 'c'].map((id) => message({ id }));
    const ids = (r: LifecycleMessageRow[]) => buildNotifications({ ...base, escrows: [], messages: r }).map((i) => i.id);
    expect(ids(rows)).toEqual(['event:a', 'event:b', 'event:c']);
    expect(ids([...rows].reverse())).toEqual(ids(rows));
  });
});

describe('clampLimit', () => {
  it('defaults, clamps and truncates', () => {
    expect(clampLimit(undefined)).toBe(50);
    expect(clampLimit(Number.NaN)).toBe(50);
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(500)).toBe(100);
    expect(clampLimit(7.9)).toBe(7);
  });
});

describe('actionableEscrowsWhere', () => {
  it('scopes to the caller\'s wallets as sender or receiver, in actionable statuses only', () => {
    const where = actionableEscrowsWhere([GUEST], false) as any;
    expect(where.status._in).toEqual(['created', 'funded', 'milestone_approved', 'disputed']);
    expect(where._or).toEqual([{ sender_address: { _in: [GUEST] } }, { receiver_address: { _in: [GUEST] } }]);
  });

  it('adds disputed escrows only for the platform resolver', () => {
    const where = actionableEscrowsWhere([PLATFORM], true) as any;
    expect(where._or).toHaveLength(2);
    expect(where._or[1]).toEqual({ status: { _eq: 'disputed' } });
  });
});
