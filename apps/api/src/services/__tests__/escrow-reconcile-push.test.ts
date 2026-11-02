import { beforeEach, describe, expect, it, vi } from 'vitest';

const { hasuraRequest, confirmTransaction, notifyEscrowLifecycleParticipants } = vi.hoisted(() => ({
  hasuraRequest: vi.fn(),
  confirmTransaction: vi.fn(),
  notifyEscrowLifecycleParticipants: vi.fn(() => new Promise<void>(() => {})),
}));

vi.mock('../hasura.js', () => ({ hasuraRequest }));
vi.mock('../stellar-confirm.js', () => ({ confirmTransaction }));
vi.mock('../conversation-events.js', () => ({
  prepareEscrowLifecycleMessage: vi.fn().mockResolvedValue({
    conversationId: 'conversation-1',
    event: {
      event_type: 'escrow_funded',
      event_key: 'escrow:contract-1:escrow_funded',
      body: 'Body must not be used as notification content',
    },
  }),
  lifecycleMessageInput: vi.fn(),
  messageMutationFields: vi.fn(() => 'insert_messages_one { id }'),
  messageMutationVariable: vi.fn(() => '$message: messages_insert_input!'),
  notifyEscrowLifecycleParticipants,
}));

import { syncEscrows } from '../escrow-reconcile.js';

describe('escrow reconciliation push delivery', () => {
  let insertedMessage: { id: string } | null;

  beforeEach(() => {
    vi.clearAllMocks();
    insertedMessage = null;
    confirmTransaction.mockResolvedValue('success');
    hasuraRequest.mockImplementation(async (query: string) => {
      if (query.includes('PendingEscrowTransactions')) {
        return {
          escrow_transactions: [{
            id: 'action-1',
            action: 'fund',
            contract_id: 'contract-1',
            engagement_id: 'engagement-1',
            tx_hash: 'tx-1',
            created_at: '2020-01-01T00:00:00.000Z',
          }],
        };
      }
      if (query.includes('EscrowStatus')) return { escrows: [{ status: 'created' }], trustless_work_escrows: [] };
      if (query.includes('mutation ApplyEscrowTransition')) {
        return { insert_messages_one: insertedMessage };
      }
      if (query.includes('ReconcileEscrows')) return { escrows: [] };
      throw new Error(`Unexpected query: ${query.slice(0, 60)}`);
    });
  });

  it('does not notify on an event-key conflict', async () => {
    await syncEscrows();

    expect(notifyEscrowLifecycleParticipants).not.toHaveBeenCalled();
  });

  it('notifies after a newly inserted event without waiting for notification delivery', async () => {
    insertedMessage = { id: 'message-1' };

    await expect(syncEscrows()).resolves.toMatchObject({ confirmed: 1 });

    expect(notifyEscrowLifecycleParticipants).toHaveBeenCalledWith(
      'conversation-1',
      'escrow_funded',
    );
  });
});
