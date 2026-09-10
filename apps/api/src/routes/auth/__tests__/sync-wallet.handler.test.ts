import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';

vi.mock('../../../services/hasura.js', () => ({
  hasuraRequest: vi.fn(),
}));

import { hasuraRequest } from '../../../services/hasura.js';
import { syncWalletHandler } from '../sync-wallet.handler.js';

const WALLET_ADDRESS = `G${'A'.repeat(55)}`;

function mockReq(isPrimary: boolean) {
  return {
    user: { uid: 'uid-1' },
    body: {
      walletAddress: WALLET_ADDRESS,
      chainType: 'STELLAR',
      isPrimary,
      provider: 'freighter',
    },
  } as any;
}

function mockRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('syncWalletHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasuraRequest).mockResolvedValue({
      insert_user_wallets_one: {
        id: 'wallet-1',
        wallet_address: WALLET_ADDRESS,
        chain_type: 'STELLAR',
        is_primary: true,
        provider: 'freighter',
      },
    });
  });

  it('atomically demotes the existing primary before promoting a wallet', async () => {
    const res = mockRes();

    await syncWalletHandler(mockReq(true), res as unknown as Response);

    const [query, variables] = vi.mocked(hasuraRequest).mock.calls[0];
    expect(query.indexOf('update_user_wallets')).toBeLessThan(
      query.indexOf('insert_user_wallets_one'),
    );
    expect(query).toContain('@include(if: $isPrimary)');
    expect(query).toContain('constraint: unique_wallet_address');
    expect(variables).toMatchObject({ userId: 'uid-1', isPrimary: true });
    expect(res.statusCode).toBe(200);
  });
});
