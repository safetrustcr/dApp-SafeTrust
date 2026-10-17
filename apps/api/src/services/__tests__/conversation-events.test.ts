import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hasura.js', () => ({ hasuraRequest: vi.fn() }));

import { hasuraRequest } from '../hasura.js';
import {
  buildEventKey,
  buildLifecycleEvent,
  getEscrowConversationId,
  messageMutationFields,
} from '../conversation-events.js';

const requestMock = vi.mocked(hasuraRequest);

describe('escrow lifecycle conversation events', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ['initialize', 'created', 'escrow_created', 'Escrow created for Lake House. Waiting for the deposit.'],
    ['fund', 'funded', 'escrow_funded', 'Deposit of 950 USDC is locked in escrow on Stellar Testnet.'],
    ['mark_milestone_completed', 'funded', 'milestone_completed', 'The host marked the stay as completed. Guest: review and approve.'],
    ['approve_milestone', 'milestone_approved', 'milestone_approved', 'The guest approved the milestone. The deposit can now be released.'],
    ['release_funds', 'completed', 'funds_released', 'The deposit was released to the host.'],
    ['dispute', 'disputed', 'dispute_opened', 'A dispute was opened. The platform will review it.'],
    ['resolve_dispute', 'resolved', 'dispute_resolved', 'The dispute was resolved.'],
  ])('maps %s to %s', (action, toStatus, event_type, body) => {
    const event = buildLifecycleEvent({
      contractId: 'C123',
      action,
      toStatus,
      apartmentName: 'Lake House',
      amount: 950,
      asset: 'USDC',
    });
    expect(event).toMatchObject({ event_type, body });
  });

  it('builds a stable event key from contract id and type', () => {
    expect(buildEventKey('C123', 'escrow_funded')).toBe('escrow:C123:escrow_funded');
  });

  it('adds a Testnet explorer link when the transaction hash is known', () => {
    const event = buildLifecycleEvent({ contractId: 'C123', action: 'fund', toStatus: 'funded', txHash: 'abc123' });
    expect(event?.body).toContain('https://stellar.expert/explorer/testnet/tx/abc123');
  });

  it('ignores a duplicate event by using the conversation event unique constraint', () => {
    expect(messageMutationFields()).toContain(
      'on_conflict: { constraint: messages_conversation_event_key, update_columns: [] }',
    );
  });

  it('skips and logs a transition when no escrow conversation is linked', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    requestMock
      .mockResolvedValueOnce({ escrows: [{ id: 'e-1' }] } as never)
      .mockResolvedValueOnce({ conversations: [] } as never);

    await expect(getEscrowConversationId('C123')).resolves.toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
