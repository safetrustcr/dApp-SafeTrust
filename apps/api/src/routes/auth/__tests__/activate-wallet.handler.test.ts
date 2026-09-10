import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response }               from 'express';
import { activateWalletHandler }                from '../activate-wallet.handler.js';

vi.mock('firebase-admin/auth', () => ({
  getAuth: vi.fn(),
}));

import { getAuth } from 'firebase-admin/auth';

interface MockResponse {
  _status: number | null;
  _body: unknown;
  status(code: number): MockResponse;
  json(payload: unknown): MockResponse;
}

function mockReq(token?: string): Request {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: {},
  } as unknown as Request;
}

function mockRes(): MockResponse {
  const res: MockResponse = {
    _status: null,
    _body: undefined,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(payload: unknown) {
      this._body = payload;
      return this;
    },
  };
  return res;
}

describe('activateWalletHandler', () => {
  let mockVerifyIdToken: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.POLLAR_SECRET_KEY = 'sk_test_pollar';
    process.env.POLLAR_ACTIVATE_URL = 'https://sdk.api.pollar.xyz/v2/wallet/activate';
    process.env.HASURA_GRAPHQL_URL = 'http://hasura.test/v1/graphql';
    process.env.HASURA_ADMIN_SECRET = 'secret';

    mockVerifyIdToken = vi.fn().mockResolvedValue({ uid: 'uid-1' });
    vi.mocked(getAuth).mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    } as any);
  });

  it('returns 401 when the bearer token is missing', async () => {
    const res = mockRes();
    await activateWalletHandler(mockReq(), res as unknown as Response);
    expect(res._status).toBe(401);
    expect((res._body as { error: string }).error).toBe('Missing or malformed Bearer token');
  });

  it('returns 401 when the token payload cannot be decoded', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Invalid token'));

    const res = mockRes();
    await activateWalletHandler(mockReq('invalid-token'), res as unknown as Response);
    expect(res._status).toBe(401);
    expect((res._body as { error: string }).error).toBe('Invalid or expired Firebase token');
  });

  it('returns 500 when POLLAR_SECRET_KEY is not configured', async () => {
    delete process.env.POLLAR_SECRET_KEY;
    const res = mockRes();
    await activateWalletHandler(mockReq('valid-token'), res as unknown as Response);
    expect(res._status).toBe(500);
    expect((res._body as { error: string }).error).toBe('Pollar is not configured on this server');
  });

  it('returns 502 when Pollar activation fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    }));

    const res = mockRes();
    await activateWalletHandler(mockReq('valid-token'), res as unknown as Response);

    expect(res._status).toBe(502);
    expect((res._body as { error: string }).error).toBe('Pollar activation failed');
  });

  it('stores the Pollar G-address and returns it on success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: 'GTESTADDRESS' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            insert_user_wallets_one: { id: 'w1', wallet_address: 'GTESTADDRESS' },
          },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const res = mockRes();
    await activateWalletHandler(mockReq('valid-token'), res as unknown as Response);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://sdk.api.pollar.xyz/v2/wallet/activate',
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test_pollar',
          'x-pollar-api-key': 'sk_test_pollar',
        }),
      }),
    );
    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      address: 'GTESTADDRESS',
      walletId: 'w1',
    });
  });

  it('returns 500 when Hasura upsert fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: 'GTESTADDRESS' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ errors: [{ message: 'constraint' }] }),
      }),
    );

    const res = mockRes();
    await activateWalletHandler(mockReq('valid-token'), res as unknown as Response);

    expect(res._status).toBe(500);
    expect((res._body as { error: string }).error).toBe('Database sync failed');
  });
});
