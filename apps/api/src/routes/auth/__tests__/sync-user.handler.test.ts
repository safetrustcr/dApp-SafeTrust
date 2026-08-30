import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyIdToken = vi.fn();

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(() => ({ verifyIdToken })),
}));

vi.mock('../../../lib/hasura.js', () => ({
  executeGraphQL: vi.fn(),
}));

import type { Request, Response } from 'express';
import { executeGraphQL } from '../../../lib/hasura.js';
import { syncUserHandler } from '../sync-user.handler.js';

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

function mockReq(body: Record<string, unknown> = {}, authorization = 'Bearer valid-id-token') {
  return {
    headers: { authorization },
    body,
  } as unknown as Request;
}

describe('syncUserHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyIdToken.mockResolvedValue({
      uid: 'uid-123',
      email: 'alice@example.com',
      name: 'Alice Smith',
    });
    mockExecuteGraphQL.mockResolvedValue({
      insert_users_one: { id: 'uid-123', email: 'alice@example.com' },
    });
  });

  it('verifies the Firebase ID token before upserting the user', async () => {
    const res = mockRes();

    await syncUserHandler(
      mockReq({ phone_number: '5551234', country_code: 'CR', location: 'San José' }),
      res,
    );

    expect(verifyIdToken).toHaveBeenCalledWith('valid-id-token');
    expect(mockExecuteGraphQL).toHaveBeenCalledTimes(1);
    expect(mockExecuteGraphQL).toHaveBeenCalledWith(
      expect.stringContaining('mutation UpsertUser'),
      expect.objectContaining({
        id: 'uid-123',
        email: 'alice@example.com',
        first_name: 'Alice',
        last_name: 'Smith',
      }),
    );
    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      success: true,
      user: { id: 'uid-123', email: 'alice@example.com' },
    });
  });
});
