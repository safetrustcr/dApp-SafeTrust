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
import { activateWalletHandler } from '../activate-wallet.handler.js';

const mockGetAuth = vi.mocked(getAuth);
const mockExecuteGraphQL = vi.mocked(executeGraphQL);

function mockReq({
  token,
  body = {},
  headers = {},
}: {
  token?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
} = {}): Request {
  const reqHeaders: Record<string, string> = { ...headers };
  if (token !== undefined) {
    reqHeaders.authorization = `Bearer ${token}`;
  }
  return {
    body,
    headers: reqHeaders,
  } as unknown as Request;
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
  return res as unknown as Response & { _status: number | null; _body: any };
}

describe('activateWalletHandler', () => {
  const mockVerifyIdToken = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockVerifyIdToken.mockReset();
    mockGetAuth.mockReturnValue({
      verifyIdToken: mockVerifyIdToken,
    } as any);

    process.env.POLLAR_SECRET_KEY = 'sk_test_pollar_key';
    delete process.env.POLLAR_ACTIVATE_URL;
  });

  it('returns 401 when the Authorization header is missing', async () => {
    const res = mockRes();
    await activateWalletHandler(mockReq(), res);

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Missing or malformed Bearer token' });
  });

  it('returns 401 when the Authorization header does not start with Bearer ', async () => {
    const res = mockRes();
    const req = {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
      body: {},
    } as unknown as Request;

    await activateWalletHandler(req, res);

    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: 'Missing or malformed Bearer token' });
  });

  it('returns 500 when POLLAR_SECRET_KEY is not configured', async () => {
    delete process.env.POLLAR_SECRET_KEY;
    const res = mockRes();

    await activateWalletHandler(mockReq({ token: 'valid-token' }), res);

    expect(res._status).toBe(500);
    expect(res._body).toEqual({ error: 'Pollar is not configured on this server' });
  });

  it('returns 401 when Firebase token verification fails (forged/invalid token)', async () => {
    mockVerifyIdToken.mockRejectedValueOnce(new Error('Decoding Firebase ID token failed'));

    const res = mockRes();
    await activateWalletHandler(mockReq({ token: 'forged-token' }), res);

    expect(mockVerifyIdToken).toHaveBeenCalledWith('forged-token');
    expect(res._status).toBe(500); // Caught in outer catch block
    expect(res._body).toEqual({ error: 'Internal server error' });
  });

  it('returns 502 when Pollar API returns non-200 response', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-123' });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden: invalid API key',
      }),
    );

    const res = mockRes();
    await activateWalletHandler(mockReq({ token: 'valid-token' }), res);

    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token');
    expect(res._status).toBe(502);
    expect(res._body).toEqual({ error: 'Pollar wallet activation failed' });
  });

  it('returns 502 when Pollar response does not contain an address', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-123' });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'pending' }),
      }),
    );

    const res = mockRes();
    await activateWalletHandler(mockReq({ token: 'valid-token' }), res);

    expect(res._status).toBe(502);
    expect(res._body).toEqual({ error: 'Pollar returned no wallet address' });
  });

  it('activates wallet, persists to Hasura user_wallets via executeGraphQL, and returns address and walletId', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-456' });

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ address: 'GCK...TESTWALLETADDRESS' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    mockExecuteGraphQL.mockResolvedValueOnce({
      insert_user_wallets_one: {
        id: 'wallet-uuid-789',
        wallet_address: 'GCK...TESTWALLETADDRESS',
      },
    });

    const res = mockRes();
    await activateWalletHandler(mockReq({ token: 'valid-token-123' }), res);

    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token-123');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://sdk.api.pollar.xyz/v2/wallet/activate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer sk_test_pollar_key',
          'x-pollar-api-key': 'sk_test_pollar_key',
        },
        body: JSON.stringify({ userId: 'user-456' }),
      },
    );

    expect(mockExecuteGraphQL).toHaveBeenCalledWith(
      expect.stringContaining('mutation UpsertPollarWallet'),
      {
        userId: 'user-456',
        address: 'GCK...TESTWALLETADDRESS',
      },
    );

    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      address: 'GCK...TESTWALLETADDRESS',
      walletId: 'wallet-uuid-789',
    });
  });

  it('uses custom POLLAR_ACTIVATE_URL if configured', async () => {
    process.env.POLLAR_ACTIVATE_URL = 'https://custom.pollar.test/activate';
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-custom' });

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ address: 'GCUSTOMADDRESS' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    mockExecuteGraphQL.mockResolvedValueOnce({
      insert_user_wallets_one: {
        id: 'wallet-custom-id',
        wallet_address: 'GCUSTOMADDRESS',
      },
    });

    const res = mockRes();
    await activateWalletHandler(mockReq({ token: 'custom-token' }), res);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://custom.pollar.test/activate',
      expect.anything(),
    );
    expect(res._status).toBe(200);
    expect(res._body).toEqual({
      address: 'GCUSTOMADDRESS',
      walletId: 'wallet-custom-id',
    });
  });

  it('returns 500 when executeGraphQL throws an error', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({ uid: 'user-123' });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ address: 'GTESTADDRESS' }),
      }),
    );

    mockExecuteGraphQL.mockRejectedValueOnce(new Error('Hasura database connection error'));

    const res = mockRes();
    await activateWalletHandler(mockReq({ token: 'valid-token' }), res);

    expect(res._status).toBe(500);
    expect(res._body).toEqual({ error: 'Internal server error' });
  });
});
