import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.middleware.js';
import { ApiError } from '../../../http/api-error.js';

vi.mock('../../../services/messages-db.js', () => ({
  getApartment: vi.fn(),
  getConversation: vi.fn(),
  upsertConversation: vi.fn(),
  markConversationRead: vi.fn(),
}));

import {
  getApartment,
  getConversation,
  upsertConversation,
  markConversationRead,
} from '../../../services/messages-db.js';
import {
  startConversationHandler,
  markConversationReadHandler,
} from '../conversations.handler.js';

const mockGetApartment = vi.mocked(getApartment);
const mockGetConversation = vi.mocked(getConversation);
const mockUpsertConversation = vi.mocked(upsertConversation);
const mockMarkConversationRead = vi.mocked(markConversationRead);

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
    send() {
      return this;
    },
  };
  return res as unknown as Response & { _status: number | null; _body: unknown };
}

function mockReq(options: {
  uid?: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
} = {}) {
  return {
    user: { uid: options.uid ?? 'guest-uid-1', email: 'guest@example.com', role: 'guest' },
    body: options.body ?? {},
    params: options.params ?? {},
  } as unknown as AuthenticatedRequest;
}

describe('startConversationHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects with 400 FORBIDDEN_FIELD when body contains senderId', async () => {
    const req = mockReq({
      body: { apartmentId: 'c2b5d43e-a813-40a2-b25c-8b832b35a777', senderId: 'evil-id' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await startConversationHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(400);
    expect(err.code).toBe('FORBIDDEN_FIELD');
  });

  it('rejects with 400 FORBIDDEN_FIELD when body contains isAutomated', async () => {
    const req = mockReq({
      body: { apartmentId: 'c2b5d43e-a813-40a2-b25c-8b832b35a777', isAutomated: true },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await startConversationHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(400);
    expect(err.code).toBe('FORBIDDEN_FIELD');
  });

  it('rejects with 400 FORBIDDEN_FIELD when body contains eventType or eventKey', async () => {
    const req = mockReq({
      body: { apartmentId: 'c2b5d43e-a813-40a2-b25c-8b832b35a777', eventType: 'booking', eventKey: 'k1' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await startConversationHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(400);
    expect(err.code).toBe('FORBIDDEN_FIELD');
  });

  it('rejects with 400 INVALID_APARTMENT_ID when apartmentId is missing or empty', async () => {
    const req = mockReq({ body: { apartmentId: '   ' } });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await startConversationHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(400);
    expect(err.code).toBe('INVALID_APARTMENT_ID');
  });

  it('rejects with 404 when apartment does not exist', async () => {
    mockGetApartment.mockResolvedValueOnce(null);

    const req = mockReq({ body: { apartmentId: 'c2b5d43e-a813-40a2-b25c-8b832b35a777' } });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await startConversationHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(404);
    expect(err.code).toBe('APARTMENT_NOT_FOUND');
  });

  it('rejects with 400 CANNOT_MESSAGE_OWN_LISTING when caller is the apartment owner', async () => {
    mockGetApartment.mockResolvedValueOnce({
      id: 'c2b5d43e-a813-40a2-b25c-8b832b35a777',
      owner_id: 'host-uid-1',
    });

    // Caller is host-uid-1 (the owner)
    const req = mockReq({
      uid: 'host-uid-1',
      body: { apartmentId: 'c2b5d43e-a813-40a2-b25c-8b832b35a777' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await startConversationHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(400);
    expect(err.code).toBe('CANNOT_MESSAGE_OWN_LISTING');
  });

  it('returns 201 { conversationId, created: true } when conversation is newly created', async () => {
    mockGetApartment.mockResolvedValueOnce({
      id: 'c2b5d43e-a813-40a2-b25c-8b832b35a777',
      owner_id: 'host-uid-1',
    });
    mockUpsertConversation.mockResolvedValueOnce({
      conversationId: 'convo-uuid-1',
      created: true,
    });

    // Body contains hostId which must have no effect (host derived from DB)
    const req = mockReq({
      uid: 'guest-uid-1',
      body: { apartmentId: 'c2b5d43e-a813-40a2-b25c-8b832b35a777', hostId: 'ignored-host-id' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await startConversationHandler(req, res, next);

    expect(mockUpsertConversation).toHaveBeenCalledWith({
      apartmentId: 'c2b5d43e-a813-40a2-b25c-8b832b35a777',
      hostId: 'host-uid-1',
      guestId: 'guest-uid-1',
    });
    expect(res._status).toBe(201);
    expect(res._body).toEqual({
      conversationId: 'convo-uuid-1',
      created: true,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 200 { conversationId, created: false } when thread already exists', async () => {
    mockGetApartment.mockResolvedValueOnce({
      id: 'c2b5d43e-a813-40a2-b25c-8b832b35a777',
      owner_id: 'host-uid-1',
    });
    mockUpsertConversation.mockResolvedValueOnce({
      conversationId: 'convo-uuid-1',
      created: false,
    });

    const req = mockReq({
      uid: 'guest-uid-1',
      body: { apartmentId: 'c2b5d43e-a813-40a2-b25c-8b832b35a777' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await startConversationHandler(req, res, next);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      conversationId: 'convo-uuid-1',
      created: false,
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('markConversationReadHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when conversation does not exist', async () => {
    mockGetConversation.mockResolvedValueOnce(null);

    const req = mockReq({
      uid: 'user-1',
      params: { id: 'c2b5d43e-a813-40a2-b25c-8b832b35a777' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await markConversationReadHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(404);
    expect(err.code).toBe('CONVERSATION_NOT_FOUND');
  });

  it('rejects with 403 NOT_A_PARTICIPANT when caller is neither host nor guest', async () => {
    mockGetConversation.mockResolvedValueOnce({
      id: 'c2b5d43e-a813-40a2-b25c-8b832b35a777',
      apartment_id: 'apt-1',
      host_id: 'host-uid-1',
      guest_id: 'guest-uid-1',
    });

    const req = mockReq({
      uid: 'random-stranger-uid',
      params: { id: 'c2b5d43e-a813-40a2-b25c-8b832b35a777' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await markConversationReadHandler(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
    expect(err.status).toBe(403);
    expect(err.code).toBe('NOT_A_PARTICIPANT');
  });

  it('marks read for host and returns 204', async () => {
    mockGetConversation.mockResolvedValueOnce({
      id: 'c2b5d43e-a813-40a2-b25c-8b832b35a777',
      apartment_id: 'apt-1',
      host_id: 'host-uid-1',
      guest_id: 'guest-uid-1',
    });

    const req = mockReq({
      uid: 'host-uid-1',
      params: { id: 'c2b5d43e-a813-40a2-b25c-8b832b35a777' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await markConversationReadHandler(req, res, next);

    expect(mockMarkConversationRead).toHaveBeenCalledWith({
      conversationId: 'c2b5d43e-a813-40a2-b25c-8b832b35a777',
      readerRole: 'host',
    });
    expect(res._status).toBe(204);
    expect(next).not.toHaveBeenCalled();
  });

  it('marks read for guest and returns 204', async () => {
    mockGetConversation.mockResolvedValueOnce({
      id: 'c2b5d43e-a813-40a2-b25c-8b832b35a777',
      apartment_id: 'apt-1',
      host_id: 'host-uid-1',
      guest_id: 'guest-uid-1',
    });

    const req = mockReq({
      uid: 'guest-uid-1',
      params: { id: 'c2b5d43e-a813-40a2-b25c-8b832b35a777' },
    });
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await markConversationReadHandler(req, res, next);

    expect(mockMarkConversationRead).toHaveBeenCalledWith({
      conversationId: 'c2b5d43e-a813-40a2-b25c-8b832b35a777',
      readerRole: 'guest',
    });
    expect(res._status).toBe(204);
    expect(next).not.toHaveBeenCalled();
  });
});
