import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('../../../lib/hasura.js', () => ({
  executeGraphQL: vi.fn(),
}));

import { getAuth } from 'firebase-admin/auth';
import { executeGraphQL } from '../../../lib/hasura.js';
import { syncUserHandler } from '../sync-user.handler.js';

const mockGetAuth = vi.mocked(getAuth);
const mockExecuteGraphQL = vi.mocked(executeGraphQL);

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

function mockReq({
  token,
  body = {},
}: {
  token?: string | null;
  body?: Record<string, unknown>;
} = {}) {
  const headers: Record<string, string> = {};
  if (token !== undefined) {
    if (token !== null) {
      headers.authorization = `Bearer ${token}`;
    }
  }
  return {
    headers,
    body,
  } as unknown as Request;
}

describe('syncUserHandler', () => {
  const verifyIdTokenMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    mockGetAuth.mockReturnValue({
      verifyIdToken: verifyIdTokenMock,
    } as unknown as ReturnType<typeof getAuth>);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = { headers: {}, body: {} } as Request;
    const res = mockRes();

    await syncUserHandler(req, res);

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Missing or malformed Bearer token' });
  });

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const req = { headers: { authorization: 'Basic 12345' }, body: {} } as unknown as Request;
    const res = mockRes();

    await syncUserHandler(req, res);

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Missing or malformed Bearer token' });
  });

  it('returns 500 when verifyIdToken rejects (e.g. forged or expired token)', async () => {
    verifyIdTokenMock.mockRejectedValueOnce(new Error('Firebase ID token has expired'));

    const req = mockReq({ token: 'invalid.jwt.token' });
    const res = mockRes();

    await syncUserHandler(req, res);

    expect(res._status).toBe(500);
    expect(res._body).toEqual({ error: 'Internal server error' });
  });

  it('returns 400 when decodedToken does not contain an email', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({
      uid: 'user-123',
      name: 'John Doe',
    });

    const req = mockReq({ token: 'valid.token' });
    const res = mockRes();

    await syncUserHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toEqual({ error: 'Token must contain a valid email' });
  });

  it('successfully verifies token and upserts user in Hasura', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({
      uid: 'user-123',
      email: 'john@example.com',
      name: 'John Doe',
    });

    mockExecuteGraphQL.mockResolvedValueOnce({
      insert_users_one: {
        id: 'user-123',
        email: 'john@example.com',
      },
    });

    const req = mockReq({
      token: 'valid.token',
      body: {
        phone_number: '+1234567890',
        country_code: 'US',
        location: 'San Jose, CA',
      },
    });
    const res = mockRes();

    await syncUserHandler(req, res);

    expect(verifyIdTokenMock).toHaveBeenCalledWith('valid.token');
    expect(mockExecuteGraphQL).toHaveBeenCalledTimes(1);
    expect(mockExecuteGraphQL).toHaveBeenCalledWith(
      expect.stringContaining('mutation UpsertUser'),
      {
        id: 'user-123',
        email: 'john@example.com',
        first_name: 'John',
        last_name: 'Doe',
        phone_number: '+1234567890',
        country_code: 'US',
        location: 'San Jose, CA',
      },
    );

    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      success: true,
      user: { id: 'user-123', email: 'john@example.com' },
    });
  });

  it('assigns dev_role when dev_role is valid and NODE_ENV is not production', async () => {
    verifyIdTokenMock.mockResolvedValueOnce({
      uid: 'user-guest-1',
      email: 'guest@example.com',
      name: 'Alice Smith',
    });

    mockExecuteGraphQL
      .mockResolvedValueOnce({
        insert_users_one: { id: 'user-guest-1', email: 'guest@example.com' },
      })
      .mockResolvedValueOnce({
        roles: [{ id: 1 }],
      })
      .mockResolvedValueOnce({
        insert_user_roles_one: { id: 'ur-1' },
      });

    const req = mockReq({
      token: 'valid.token',
      body: {
        dev_role: 'guest',
      },
    });
    const res = mockRes();

    await syncUserHandler(req, res);

    expect(res._status).toBe(200);
    expect(mockExecuteGraphQL).toHaveBeenCalledTimes(3);
    expect(mockExecuteGraphQL.mock.calls[1][1]).toEqual({ roleName: 'guest' });
    expect(mockExecuteGraphQL.mock.calls[2][1]).toEqual({
      userId: 'user-guest-1',
      roleId: 1,
    });
  });

  it('does not assign dev_role in production mode', async () => {
    process.env.NODE_ENV = 'production';

    verifyIdTokenMock.mockResolvedValueOnce({
      uid: 'user-prod-1',
      email: 'prod@example.com',
      name: 'Bob Builder',
    });

    mockExecuteGraphQL.mockResolvedValueOnce({
      insert_users_one: { id: 'user-prod-1', email: 'prod@example.com' },
    });

    const req = mockReq({
      token: 'valid.token',
      body: {
        dev_role: 'host',
      },
    });
    const res = mockRes();

    await syncUserHandler(req, res);

    expect(res._status).toBe(200);
    expect(mockExecuteGraphQL).toHaveBeenCalledTimes(1);
  });
});
