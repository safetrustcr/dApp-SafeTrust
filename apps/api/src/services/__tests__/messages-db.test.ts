import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hasura.js', () => ({
  hasuraRequest: vi.fn(),
  isUniqueViolation: vi.fn(),
  HasuraRequestError: class extends Error {},
}));

import { hasuraRequest, isUniqueViolation } from '../hasura.js';
import {
  getApartment,
  getConversation,
  getConversationByPair,
  upsertConversation,
  insertManualMessage,
  markConversationRead,
} from '../messages-db.js';

const mockHasuraRequest = vi.mocked(hasuraRequest);
const mockIsUniqueViolation = vi.mocked(isUniqueViolation);

describe('messages-db service', () => {
  const apartmentId = '22222222-2222-2222-2222-222222222222';
  const conversationId = '33333333-3333-3333-3333-333333333333';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getApartment', () => {
    it('returns null for non-UUID strings without calling Hasura', async () => {
      const result = await getApartment('not-a-uuid');
      expect(result).toBeNull();
      expect(mockHasuraRequest).not.toHaveBeenCalled();
    });

    it('queries Hasura and returns apartment record', async () => {
      mockHasuraRequest.mockResolvedValueOnce({
        apartments: [{ id: apartmentId, owner_id: 'host-1' }],
      });

      const result = await getApartment(apartmentId);
      expect(result).toEqual({ id: apartmentId, owner_id: 'host-1' });
      expect(mockHasuraRequest).toHaveBeenCalledWith(expect.stringContaining('GetApartment'), {
        apartmentId,
      });
    });

    it('returns null when apartment is not found in DB', async () => {
      mockHasuraRequest.mockResolvedValueOnce({ apartments: [] });

      const result = await getApartment(apartmentId);
      expect(result).toBeNull();
    });
  });

  describe('getConversation', () => {
    it('returns null for invalid UUIDs without calling Hasura', async () => {
      const result = await getConversation('bad-id');
      expect(result).toBeNull();
      expect(mockHasuraRequest).not.toHaveBeenCalled();
    });

    it('queries Hasura and returns conversation record', async () => {
      mockHasuraRequest.mockResolvedValueOnce({
        conversations: [
          {
            id: conversationId,
            apartment_id: apartmentId,
            host_id: 'host-1',
            guest_id: 'guest-1',
          },
        ],
      });

      const result = await getConversation(conversationId);
      expect(result).toEqual({
        id: conversationId,
        apartment_id: apartmentId,
        host_id: 'host-1',
        guest_id: 'guest-1',
      });
    });
  });

  describe('upsertConversation', () => {
    it('returns created: true when insert succeeds', async () => {
      mockHasuraRequest.mockResolvedValueOnce({
        insert_conversations_one: { id: conversationId },
      });

      const result = await upsertConversation({
        apartmentId,
        hostId: 'host-1',
        guestId: 'guest-1',
      });

      expect(result).toEqual({
        conversationId,
        created: true,
      });
    });

    it('returns created: false and existing id when on_conflict returns null', async () => {
      mockHasuraRequest
        .mockResolvedValueOnce({ insert_conversations_one: null }) // conflict DO NOTHING
        .mockResolvedValueOnce({
          conversations: [{ id: conversationId, apartment_id: apartmentId, host_id: 'host-1', guest_id: 'guest-1' }],
        });

      const result = await upsertConversation({
        apartmentId,
        hostId: 'host-1',
        guestId: 'guest-1',
      });

      expect(result).toEqual({
        conversationId,
        created: false,
      });
      expect(mockHasuraRequest).toHaveBeenCalledTimes(2);
    });

    it('handles unique violation error gracefully and resolves existing conversation', async () => {
      const uniqueError = new Error('Unique violation');
      mockIsUniqueViolation.mockReturnValueOnce(true);
      mockHasuraRequest
        .mockRejectedValueOnce(uniqueError)
        .mockResolvedValueOnce({
          conversations: [{ id: conversationId, apartment_id: apartmentId, host_id: 'host-1', guest_id: 'guest-1' }],
        });

      const result = await upsertConversation({
        apartmentId,
        hostId: 'host-1',
        guestId: 'guest-1',
      });

      expect(result).toEqual({
        conversationId,
        created: false,
      });
    });
  });

  describe('insertManualMessage', () => {
    it('sends single-document mutation inserting message and updating host_last_read_at for host', async () => {
      const messageRecord = {
        id: 'msg-1',
        conversation_id: conversationId,
        sender_id: 'host-1',
        body: 'Hello guest',
        is_automated: false,
        event_type: null,
        created_at: '2026-09-30T12:00:00Z',
      };

      mockHasuraRequest.mockResolvedValueOnce({
        insert_messages_one: messageRecord,
        update_conversations: { affected_rows: 1 },
      });

      const result = await insertManualMessage({
        conversationId,
        senderId: 'host-1',
        body: 'Hello guest',
        readerRole: 'host',
      });

      expect(result).toEqual(messageRecord);
      expect(mockHasuraRequest).toHaveBeenCalledWith(
        expect.stringContaining('host_last_read_at'),
        expect.objectContaining({
          conversationId,
          senderId: 'host-1',
          body: 'Hello guest',
        }),
      );
    });

    it('sends single-document mutation inserting message and updating guest_last_read_at for guest', async () => {
      const messageRecord = {
        id: 'msg-2',
        conversation_id: conversationId,
        sender_id: 'guest-1',
        body: 'Hello host',
        is_automated: false,
        event_type: null,
        created_at: '2026-09-30T12:00:00Z',
      };

      mockHasuraRequest.mockResolvedValueOnce({
        insert_messages_one: messageRecord,
        update_conversations: { affected_rows: 1 },
      });

      const result = await insertManualMessage({
        conversationId,
        senderId: 'guest-1',
        body: 'Hello host',
        readerRole: 'guest',
      });

      expect(result).toEqual(messageRecord);
      expect(mockHasuraRequest).toHaveBeenCalledWith(
        expect.stringContaining('guest_last_read_at'),
        expect.objectContaining({
          conversationId,
          senderId: 'guest-1',
          body: 'Hello host',
        }),
      );
    });
  });

  describe('markConversationRead', () => {
    it('sets host_last_read_at when reader is host', async () => {
      mockHasuraRequest.mockResolvedValueOnce({
        update_conversations: { affected_rows: 1 },
      });

      await markConversationRead({ conversationId, readerRole: 'host' });

      expect(mockHasuraRequest).toHaveBeenCalledWith(
        expect.stringContaining('MarkHostConversationRead'),
        expect.objectContaining({ conversationId }),
      );
    });

    it('sets guest_last_read_at when reader is guest', async () => {
      mockHasuraRequest.mockResolvedValueOnce({
        update_conversations: { affected_rows: 1 },
      });

      await markConversationRead({ conversationId, readerRole: 'guest' });

      expect(mockHasuraRequest).toHaveBeenCalledWith(
        expect.stringContaining('MarkGuestConversationRead'),
        expect.objectContaining({ conversationId }),
      );
    });
  });
});
