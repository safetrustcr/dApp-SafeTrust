import { describe, expect, it, vi } from 'vitest';

import type { NextFunction, Request, Response } from 'express';

import { requireAuth, type AuthenticatedRequest } from '../auth.middleware.js';

function makeToken(payload: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encoded}.signature`;
}

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

describe('requireAuth', () => {
  it('attaches the uid from user_id and calls next', () => {
    const req = mockReq(`Bearer ${makeToken({ user_id: 'uid-1', email: 'a@b.c' })}`);
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, mockRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect((req as AuthenticatedRequest).user).toEqual({ uid: 'uid-1', email: 'a@b.c' });
  });

  it('falls back to sub when user_id is absent', () => {
    const req = mockReq(`Bearer ${makeToken({ sub: 'uid-2' })}`);
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(req, mockRes(), next);

    expect((req as AuthenticatedRequest).user.uid).toBe('uid-2');
  });

  it('401s when the Authorization header is missing', () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(mockReq(), res, next);

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Missing token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('401s on a malformed token', () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(mockReq('Bearer not-a-jwt'), res, next);

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('401s when the token carries no uid claim', () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth(mockReq(`Bearer ${makeToken({ email: 'a@b.c' })}`), res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
