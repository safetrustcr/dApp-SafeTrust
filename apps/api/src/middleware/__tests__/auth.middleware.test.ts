import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { authenticateFirebase, type AuthenticatedRequest } from '../auth.middleware.js';

// Mock firebase-admin/auth
const mockVerifyIdToken = vi.fn();
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
  }),
}));

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

describe('authenticateFirebase', () => {
  it('attaches the user and calls next on valid token', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'uid-1', email: 'a@b.c' });

    const req = mockReq('Bearer valid-token');
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await authenticateFirebase(req, res, next);

    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token', true);
    expect(next).toHaveBeenCalledOnce();
    expect((req as AuthenticatedRequest).user).toEqual({
      uid: 'uid-1',
      email: 'a@b.c',
      role: 'guest',
    });
  });

  it('401s when the Authorization header is missing', async () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await authenticateFirebase(mockReq(), res, next);

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Missing or malformed Bearer token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('401s when Authorization header does not start with Bearer', async () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await authenticateFirebase(mockReq('Basic token'), res, next);

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Missing or malformed Bearer token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('401s when Firebase token verification fails', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    await authenticateFirebase(mockReq('Bearer invalid-token'), res, next);

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Invalid or expired Firebase token' });
    expect(next).not.toHaveBeenCalled();
  });
});
