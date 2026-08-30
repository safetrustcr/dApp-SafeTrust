import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/hasura.js', () => ({
  hasuraRequest: vi.fn(),
  HasuraRequestError: class extends Error {},
}));

import type { Response } from 'express';

import type { AuthenticatedRequest } from '../../../middleware/auth.middleware.js';
import { hasuraRequest } from '../../../services/hasura.js';
import { promoteToHostHandler } from '../promote-to-host.handler.js';

const mockHasuraRequest = vi.mocked(hasuraRequest);

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

function mockReq(uid = 'test-uid-123') {
  return { user: { uid } } as AuthenticatedRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('promoteToHostHandler', () => {
  it('looks up the host role id and inserts the assignment', async () => {
    mockHasuraRequest
      .mockResolvedValueOnce({ insert_users_one: { id: 'test-uid-123' } })
      .mockResolvedValueOnce({ roles: [{ id: 2 }] })
      .mockResolvedValueOnce({ insert_user_roles_one: { id: 'row-1' } });

    const res = mockRes();
    await promoteToHostHandler(mockReq(), res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ role: 'host', promoted: true });

    expect(mockHasuraRequest.mock.calls[1][1]).toEqual(undefined);
    expect(mockHasuraRequest.mock.calls[2][1]).toEqual({
      userId: 'test-uid-123',
      roleId: 2,
    });
  });

  it('does not hardcode a role id — uses whatever the roles table returns', async () => {
    mockHasuraRequest
      .mockResolvedValueOnce({ insert_users_one: { id: 'test-uid-123' } })
      .mockResolvedValueOnce({ roles: [{ id: 42 }] })
      .mockResolvedValueOnce({ insert_user_roles_one: { id: 'row-2' } });

    await promoteToHostHandler(mockReq(), mockRes());

    expect(mockHasuraRequest.mock.calls[2][1]).toMatchObject({ roleId: 42 });
  });

  it('returns 500 when the host role is missing from the roles table', async () => {
    mockHasuraRequest
      .mockResolvedValueOnce({ insert_users_one: { id: 'test-uid-123' } })
      .mockResolvedValueOnce({ roles: [] });

    const res = mockRes();
    await promoteToHostHandler(mockReq(), res);

    expect(res._status).toBe(500);
    expect(res._body).toEqual({ error: 'Host role is not configured' });
    // The insert must not be attempted without a resolved role id.
    expect(mockHasuraRequest).toHaveBeenCalledTimes(2);
  });

  it('returns 500 when Hasura fails', async () => {
    mockHasuraRequest.mockRejectedValueOnce(new Error('connection refused'));

    const res = mockRes();
    await promoteToHostHandler(mockReq(), res);

    expect(res._status).toBe(500);
    expect(res._body).toEqual({ error: 'Failed to promote user to host' });
  });

  it('is idempotent — a repeated promotion still resolves 200', async () => {
    mockHasuraRequest
      .mockResolvedValueOnce({ insert_users_one: { id: 'test-uid-123' } })
      .mockResolvedValueOnce({ roles: [{ id: 2 }] })
      // on_conflict with update_columns: [] returns null for an existing row.
      .mockResolvedValueOnce({ insert_user_roles_one: null });

    const res = mockRes();
    await promoteToHostHandler(mockReq(), res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ role: 'host', promoted: true });
  });
});
