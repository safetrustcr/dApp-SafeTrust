import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

vi.mock('../../services/firebase-admin.js', () => ({
  getFirebaseAuth: vi.fn(),
}));

import { getFirebaseAuth } from '../../services/firebase-admin.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.middleware.js';

const mockGetFirebaseAuth = vi.mocked(getFirebaseAuth);
const verifyIdToken = vi.fn();

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

function mockReq(authorization?: string) {
  return { headers: authorization ? { authorization } : {} } as Request;
}

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdToken.mockReset();
    mockGetFirebaseAuth.mockReturnValue({ verifyIdToken } as never);
  });

  it('attaches the uid and email from a verified Firebase token', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'uid-1', email: 'a@b.c' });
    const req = mockReq('Bearer valid-token');
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, mockRes(), next);
    await flushPromises();

    expect(verifyIdToken).toHaveBeenCalledWith('valid-token');
    expect(next).toHaveBeenCalledOnce();
    expect((req as AuthenticatedRequest).user).toEqual({ uid: 'uid-1', email: 'a@b.c' });
  });

  it('returns 401 when the Authorization header is missing', () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(mockReq(), res, next);

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Missing token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Firebase rejects the token', async () => {
    verifyIdToken.mockRejectedValue(new Error('invalid signature'));
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(mockReq('Bearer forged-token'), res, next);
    await flushPromises();

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when Firebase Admin cannot initialize', () => {
    mockGetFirebaseAuth.mockImplementation(() => {
      throw new Error('missing application credentials');
    });
    const res = mockRes();

    requireAuth(mockReq('Bearer valid-token'), res, vi.fn() as unknown as NextFunction);

    expect(res._status).toBe(500);
    expect(res._body).toEqual({ error: 'Authentication service unavailable' });
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
