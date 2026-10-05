import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.middleware.js';
import { ApiError } from '../../../http/api-error.js';

vi.mock('../../../services/messages-db.js', () => ({
  getConversation: vi.fn(),
  insertManualMessage: vi.fn(),
}));

import { getConversation, insertManualMessage } from '../../../services/messages-db.js';
import { sendMessageHandler } from '../send.handler.js';

const mockGetConversation = vi.mocked(getConversation);
const mockInsertManualMessage = vi.mocked(insertManualMessage);

function mockRes() {
  const res = {
    _status: null as number | null,
    _body: undefined as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(payload: unknown) {
      this._body = payload;
      return this;
    },
  };
  return res as unknown as Response & { _status: number | null; _body: unknown };
}

function mockReq(options: {
  uid?: string;
  body?: Record<string, unknown>;
} = {}) {
  return {
    user: { uid: options.uid ?? 'caller-uid-1', email: 'user@example.com', role: 'guest' },
    body: options.body ?? {},
  } as unknown as AuthenticatedRequest;
}

describe('sendMessageHandler', () => {
  const validConvoId = '11111111-2222-3333-4444-555555555555';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects with 400 FORBIDDEN_FIELD when body contains senderId', async () => {
    const req = mockReq({
      body: { conversationId: validConvoId, body: 'Hello', senderId: 'evil-id' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await sendMessageHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(400);
    expect(err.code).toBe('FORBIDDEN_FIELD');
  });

  it('rejects with 400 FORBIDDEN_FIELD when body contains isAutomated', async () => {
    const req = mockReq({
      body: { conversationId: validConvoId, body: 'Hello', isAutomated: true },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await sendMessageHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(400);
    expect(err.code).toBe('FORBIDDEN_FIELD');
  });

  it('rejects with 400 FORBIDDEN_FIELD when body contains eventType or eventKey', async () => {
    const req = mockReq({
      body: { conversationId: validConvoId, body: 'Hello', eventType: 'escrow.funded' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await sendMessageHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(400);
    expect(err.code).toBe('FORBIDDEN_FIELD');
  });

  it('rejects with 400 INVALID_MESSAGE_BODY when body is missing', async () => {
    const req = mockReq({ body: { conversationId: validConvoId } });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await sendMessageHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(400);
    expect(err.code).toBe('INVALID_MESSAGE_BODY');
    expect(err.detail).toContain('1–4000 characters');
  });

  it('rejects with 400 INVALID_MESSAGE_BODY when body is whitespace-only', async () => {
    const req = mockReq({ body: { conversationId: validConvoId, body: '   \n\t  ' } });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await sendMessageHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(400);
    expect(err.code).toBe('INVALID_MESSAGE_BODY');
  });

  it('rejects with 400 INVALID_MESSAGE_BODY when body exceeds 4000 characters', async () => {
    const req = mockReq({
      body: { conversationId: validConvoId, body: 'a'.repeat(4001) },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await sendMessageHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(400);
    expect(err.code).toBe('INVALID_MESSAGE_BODY');
  });

  it('rejects with 404 CONVERSATION_NOT_FOUND when conversation does not exist', async () => {
    mockGetConversation.mockResolvedValueOnce(null);

    const req = mockReq({
      body: { conversationId: validConvoId, body: 'Hello there' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await sendMessageHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(404);
    expect(err.code).toBe('CONVERSATION_NOT_FOUND');
  });

  it('rejects with 403 NOT_A_PARTICIPANT when caller is neither host nor guest', async () => {
    mockGetConversation.mockResolvedValueOnce({
      id: validConvoId,
      apartment_id: 'apt-1',
      host_id: 'host-uid-1',
      guest_id: 'guest-uid-1',
    });

    const req = mockReq({
      uid: 'random-user-uid',
      body: { conversationId: validConvoId, body: 'I want in' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await sendMessageHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(403);
    expect(err.code).toBe('NOT_A_PARTICIPANT');
  });

  it('sends message successfully when caller is guest and returns 201 { message }', async () => {
    mockGetConversation.mockResolvedValueOnce({
      id: validConvoId,
      apartment_id: 'apt-1',
      host_id: 'host-uid-1',
      guest_id: 'guest-uid-1',
    });

    const fakeMessage = {
      id: 'msg-1',
      conversation_id: validConvoId,
      sender_id: 'guest-uid-1',
      body: 'Hello host!',
      is_automated: false,
      event_type: null,
      created_at: '2026-09-30T12:00:00Z',
    };
    mockInsertManualMessage.mockResolvedValueOnce(fakeMessage);

    const req = mockReq({
      uid: 'guest-uid-1',
      body: { conversationId: validConvoId, body: 'Hello host!' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await sendMessageHandler(req, res, next);

    expect(mockInsertManualMessage).toHaveBeenCalledWith({
      conversationId: validConvoId,
      senderId: 'guest-uid-1',
      body: 'Hello host!',
      readerRole: 'guest',
    });
    expect(res._status).toBe(201);
    expect(res._body).toEqual({ message: fakeMessage });
    expect(next).not.toHaveBeenCalled();
  });

  it('sends message successfully when caller is host and returns 201 { message }', async () => {
    mockGetConversation.mockResolvedValueOnce({
      id: validConvoId,
      apartment_id: 'apt-1',
      host_id: 'host-uid-1',
      guest_id: 'guest-uid-1',
    });

    const fakeMessage = {
      id: 'msg-2',
      conversation_id: validConvoId,
      sender_id: 'host-uid-1',
      body: 'Welcome to my apartment!',
      is_automated: false,
      event_type: null,
      created_at: '2026-09-30T12:01:00Z',
    };
    mockInsertManualMessage.mockResolvedValueOnce(fakeMessage);

    const req = mockReq({
      uid: 'host-uid-1',
      body: { conversationId: validConvoId, body: 'Welcome to my apartment!' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await sendMessageHandler(req, res, next);

    expect(mockInsertManualMessage).toHaveBeenCalledWith({
      conversationId: validConvoId,
      senderId: 'host-uid-1',
      body: 'Welcome to my apartment!',
      readerRole: 'host',
    });
    expect(res._status).toBe(201);
    expect(res._body).toEqual({ message: fakeMessage });
    expect(next).not.toHaveBeenCalled();
  });
});
