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

function mockReq(
  token?: string,
  body: Record<string, unknown> = {},
): Request {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body,
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

  it('returns 400 when the wallet proof is missing', async () => {
    const res = mockRes();
    await activateWalletHandler(mockReq('valid-token'), res as unknown as Response);

    expect(res._status).toBe(400);
    expect((res._body as { error: string }).error).toBe('A wallet address and Pollar access token are required');
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

  it('returns 401 when Pollar session verification fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
    }));

    const res = mockRes();
    await activateWalletHandler(
      mockReq('valid-token', { address: 'GTESTADDRESS', pollarAccessToken: 'pollar-token' }),
      res as unknown as Response,
    );

    expect(res._status).toBe(401);
    expect((res._body as { error: string }).error).toBe('Pollar session verification failed');
  });

  it('rejects a wallet that does not match the verified Pollar session', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, content: { wallet: { address: 'GOTHERADDRESS' } } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const res = mockRes();
    await activateWalletHandler(
      mockReq('valid-token', { address: 'GTESTADDRESS', pollarAccessToken: 'pollar-token' }),
      res as unknown as Response,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res._status).toBe(403);
  });

  it('stores the matching verified Pollar wallet and returns it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          content: { wallet: { address: 'GTESTADDRESS' } },
        }),
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
    await activateWalletHandler(
      mockReq('valid-token', { address: 'GTESTADDRESS', pollarAccessToken: 'pollar-token' }),
      res as unknown as Response,
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://server.api.pollar.xyz/v1/tokens/verify',
      expect.objectContaining({
        method: 'POST',
        redirect: 'error',
        headers: expect.objectContaining({
          'x-pollar-api-key': 'sk_test_pollar',
        }),
        body: JSON.stringify({ token: 'pollar-token' }),
      }),
    );
    expect(fetchMock.mock.calls[0][1]?.headers).not.toHaveProperty('Authorization');
    const hasuraRequest = JSON.parse(
      fetchMock.mock.calls[1][1]?.body as string,
    ) as { query: string; variables: Record<string, unknown> };
    expect(hasuraRequest.query.indexOf('update_user_wallets')).toBeLessThan(
      hasuraRequest.query.indexOf('insert_user_wallets_one'),
    );
    expect(hasuraRequest.variables).toEqual({ userId: 'uid-1', address: 'GTESTADDRESS' });
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
        json: async () => ({
          success: true,
          content: { wallet: { address: 'GTESTADDRESS' } },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ errors: [{ message: 'constraint' }] }),
      }),
    );

    const res = mockRes();
    await activateWalletHandler(
      mockReq('valid-token', { address: 'GTESTADDRESS', pollarAccessToken: 'pollar-token' }),
      res as unknown as Response,
    );

    expect(res._status).toBe(500);
    expect((res._body as { error: string }).error).toBe('Database sync failed');
  });
});
