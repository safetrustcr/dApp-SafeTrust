import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { getIdToken } = vi.hoisted(() => ({
  getIdToken: vi.fn(async () => 'token-test-123'),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken } },
}));

import { auth } from '@/lib/firebase';
import { startConversation, sendMessage, markRead } from './messages';
import { ApiClientError } from './client';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('messages API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('startConversation', () => {
    it('sends POST to :3002/api/messages/conversations with Bearer token and apartmentId', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ conversationId: 'conv-123', created: true }, 201),
      );

      const result = await startConversation('apt-456');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
      expect(url).toBe('http://localhost:3002/api/messages/conversations');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer token-test-123');
      expect(JSON.parse(init.body as string)).toEqual({ apartmentId: 'apt-456' });
      expect(result).toEqual({ conversationId: 'conv-123', created: true });
    });
  });

  describe('sendMessage', () => {
    it('sends POST to :3002/api/messages/send with Bearer token, conversationId and body', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversation_id: 'conv-123',
        sender_id: 'user-1',
        body: 'Hello',
        is_automated: false,
        created_at: '2026-09-30T12:00:00Z',
      };
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ message: mockMessage }, 201),
      );

      const result = await sendMessage('conv-123', 'Hello');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
      expect(url).toBe('http://localhost:3002/api/messages/send');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer token-test-123');
      expect(JSON.parse(init.body as string)).toEqual({
        conversationId: 'conv-123',
        body: 'Hello',
      });
      expect(result).toEqual({ message: mockMessage });
    });

    it('throws ApiClientError when server responds with 400 INVALID_MESSAGE_BODY', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ detail: 'Message must be 1–4000 characters.' }, 400),
      );

      const error = await sendMessage('conv-123', '').catch((err: unknown) => err);

      expect(error).toBeInstanceOf(ApiClientError);
      expect((error as ApiClientError).status).toBe(400);
      expect((error as ApiClientError).message).toBe('Message must be 1–4000 characters.');
    });
  });

  describe('markRead', () => {
    it('sends POST to :3002/api/messages/conversations/:id/read and resolves on 204', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => null,
      });

      await markRead('conv-123');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
      expect(url).toBe('http://localhost:3002/api/messages/conversations/conv-123/read');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer token-test-123');
    });
  });

  describe('authentication error', () => {
    it('throws 401 ApiClientError before network request when signed out', async () => {
      const original = (auth as unknown as { currentUser: unknown }).currentUser;
      (auth as unknown as { currentUser: unknown }).currentUser = null;

      try {
        const error = await startConversation('apt-1').catch((err: unknown) => err);
        expect(error).toBeInstanceOf(ApiClientError);
        expect((error as ApiClientError).status).toBe(401);
        expect(fetchMock).not.toHaveBeenCalled();
      } finally {
        (auth as unknown as { currentUser: unknown }).currentUser = original;
      }
    });
  });
});
