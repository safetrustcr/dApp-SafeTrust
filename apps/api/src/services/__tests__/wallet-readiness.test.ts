import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Networks } from '@stellar/stellar-sdk';

vi.mock('../hasura.js', () => ({
  hasuraRequest: vi.fn(),
}));
vi.mock('../apartment-escrow-terms.js', () => ({
  getApartmentEscrowTerms: vi.fn(),
  ApartmentTermsError: class ApartmentTermsError extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = 'ApartmentTermsError';
    }
  },
}));
vi.mock('../hotel-reservation-escrow.js', () => ({
  getHotelReservationEscrowTerms: vi.fn(),
}));

import { hasuraRequest } from '../hasura.js';
import { getApartmentEscrowTerms } from '../apartment-escrow-terms.js';
import {
  calculateXlmThreshold,
  checkWalletReadiness,
  clearHorizonCache,
  evaluateGuestChecks,
  hasUsdcTrustline,
  loadAccountWithCache,
  buildChangeTrustXdr,
  XLM_BASE_RESERVE,
  XLM_FEE_BUFFER,
} from '../wallet-readiness.js';

const GUEST_WALLET = `G${'A'.repeat(55)}`;
const HOST_WALLET = `G${'B'.repeat(55)}`;
const PLATFORM_WALLET = `G${'C'.repeat(55)}`;
const USDC_ISSUER = `G${'D'.repeat(55)}`;
const WRONG_ISSUER = `G${'E'.repeat(55)}`;

describe('wallet-readiness service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearHorizonCache();
    process.env.PLATFORM_STELLAR_ADDRESS = PLATFORM_WALLET;
    process.env.USDC_TRUSTLINE_ADDRESS = USDC_ISSUER;
    process.env.STELLAR_NETWORK = 'TESTNET';
    delete process.env.STELLAR_NETWORK_PASSPHRASE;
  });

  describe('calculateXlmThreshold', () => {
    it('calculates reserve + subentries + fee buffer accurately', () => {
      // 0 subentries: (2 + 0) * 0.5 + 1 = 2.0 XLM
      expect(calculateXlmThreshold(0)).toBe(2.0);
      // 1 subentry: (2 + 1) * 0.5 + 1 = 2.5 XLM
      expect(calculateXlmThreshold(1)).toBe(2.5);
      // 3 subentries: (2 + 3) * 0.5 + 1 = 3.5 XLM
      expect(calculateXlmThreshold(3)).toBe(3.5);
    });
  });

  describe('evaluateGuestChecks', () => {
    it('returns accountExists: false and FUND_XLM fix on 404 / missing account (Testnet)', () => {
      const checks = evaluateGuestChecks(null, 150, USDC_ISSUER, true);

      expect(checks.accountExists?.ok).toBe(false);
      expect(checks.accountExists?.fix).toBe('FUND_XLM');
      expect(checks.xlmForFees?.ok).toBe(false);
      expect(checks.xlmForFees?.fix).toBe('FUND_XLM');
      expect(checks.trustline?.ok).toBe(false);
      expect(checks.trustline?.fix).toBe('ADD_TRUSTLINE');
      expect(checks.assetBalance?.ok).toBe(false);
      expect(checks.assetBalance?.fix).toBe('GET_TEST_USDC');
      expect(checks.assetBalance?.required).toBe('150.0000000');
    });

    it('omits FUND_XLM and GET_TEST_USDC fixes on mainnet', () => {
      const checks = evaluateGuestChecks(null, 150, USDC_ISSUER, false);

      expect(checks.accountExists?.ok).toBe(false);
      expect(checks.accountExists?.fix).toBeUndefined();
      expect(checks.xlmForFees?.ok).toBe(false);
      expect(checks.xlmForFees?.fix).toBeUndefined();
      expect(checks.trustline?.ok).toBe(false);
      expect(checks.trustline?.fix).toBe('ADD_TRUSTLINE');
      expect(checks.assetBalance?.ok).toBe(false);
      expect(checks.assetBalance?.fix).toBeUndefined();
    });

    it('detects low XLM when native balance is below minimum threshold', () => {
      const account = {
        subentry_count: 2, // threshold: (2 + 2) * 0.5 + 1 = 3.0 XLM
        balances: [
          { asset_type: 'native', balance: '2.5000000' },
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: USDC_ISSUER,
            balance: '200.0000000',
          },
        ],
      } as any;

      const checks = evaluateGuestChecks(account, 150, USDC_ISSUER, true);
      expect(checks.accountExists?.ok).toBe(true);
      expect(checks.xlmForFees?.ok).toBe(false);
      expect(checks.xlmForFees?.balance).toBe('2.5000000');
      expect(checks.xlmForFees?.fix).toBe('FUND_XLM');
      expect(checks.trustline?.ok).toBe(true);
      expect(checks.assetBalance?.ok).toBe(true);
    });

    it('detects missing USDC trustline', () => {
      const account = {
        subentry_count: 0,
        balances: [{ asset_type: 'native', balance: '100.0000000' }],
      } as any;

      const checks = evaluateGuestChecks(account, 150, USDC_ISSUER, true);
      expect(checks.trustline?.ok).toBe(false);
      expect(checks.trustline?.fix).toBe('ADD_TRUSTLINE');
      expect(checks.assetBalance?.ok).toBe(false);
      expect(checks.assetBalance?.balance).toBe('0');
      expect(checks.assetBalance?.fix).toBe('GET_TEST_USDC');
    });

    it('detects wrong USDC issuer as missing trustline', () => {
      const account = {
        subentry_count: 1,
        balances: [
          { asset_type: 'native', balance: '100.0000000' },
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: WRONG_ISSUER,
            balance: '500.0000000',
          },
        ],
      } as any;

      const checks = evaluateGuestChecks(account, 150, USDC_ISSUER, true);
      expect(checks.trustline?.ok).toBe(false);
      expect(checks.trustline?.fix).toBe('ADD_TRUSTLINE');
      expect(checks.assetBalance?.ok).toBe(false);
    });

    it('detects low USDC balance when trustline is present', () => {
      const account = {
        subentry_count: 1,
        balances: [
          { asset_type: 'native', balance: '100.0000000' },
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: USDC_ISSUER,
            balance: '75.0000000',
          },
        ],
      } as any;

      const checks = evaluateGuestChecks(account, 150, USDC_ISSUER, true);
      expect(checks.accountExists?.ok).toBe(true);
      expect(checks.xlmForFees?.ok).toBe(true);
      expect(checks.trustline?.ok).toBe(true);
      expect(checks.assetBalance?.ok).toBe(false);
      expect(checks.assetBalance?.balance).toBe('75.0000000');
      expect(checks.assetBalance?.required).toBe('150.0000000');
      expect(checks.assetBalance?.fix).toBe('GET_TEST_USDC');
    });

    it('passes all checks when account has sufficient XLM, trustline, and USDC balance', () => {
      const account = {
        subentry_count: 1,
        balances: [
          { asset_type: 'native', balance: '100.0000000' },
          {
            asset_type: 'credit_alphanum4',
            asset_code: 'USDC',
            asset_issuer: USDC_ISSUER,
            balance: '150.0000000',
          },
        ],
      } as any;

      const checks = evaluateGuestChecks(account, 150, USDC_ISSUER, true);
      expect(checks.accountExists?.ok).toBe(true);
      expect(checks.xlmForFees?.ok).toBe(true);
      expect(checks.trustline?.ok).toBe(true);
      expect(checks.assetBalance?.ok).toBe(true);
      expect(checks.assetBalance?.fix).toBeUndefined();
    });
  });

  describe('Horizon caching', () => {
    it('caches Horizon response for 15s and does not re-query', async () => {
      const mockLoadAccount = vi.fn().mockResolvedValue({
        balances: [{ asset_type: 'native', balance: '50.0000000' }],
      });
      const mockServer = { loadAccount: mockLoadAccount } as any;

      const first = await loadAccountWithCache(mockServer, GUEST_WALLET);
      const second = await loadAccountWithCache(mockServer, GUEST_WALLET);

      expect(mockLoadAccount).toHaveBeenCalledTimes(1);
      expect(first).toBe(second);
    });

    it('caches 404 responses as null without re-querying within TTL', async () => {
      const mockLoadAccount = vi.fn().mockRejectedValue({ response: { status: 404 } });
      const mockServer = { loadAccount: mockLoadAccount } as any;

      const first = await loadAccountWithCache(mockServer, GUEST_WALLET);
      const second = await loadAccountWithCache(mockServer, GUEST_WALLET);

      expect(mockLoadAccount).toHaveBeenCalledTimes(1);
      expect(first).toBeNull();
      expect(second).toBeNull();
    });
  });

  describe('checkWalletReadiness', () => {
    it('reports registeredWallet: false with fix LINK_WALLET when guest has no wallet', async () => {
      vi.mocked(hasuraRequest).mockResolvedValue({ user_wallets: [] });
      vi.mocked(getApartmentEscrowTerms).mockResolvedValue({
        apartmentId: 'apt-1',
        ownerUserId: 'host-uid',
        receiverAddress: HOST_WALLET,
        amount: 250,
      });

      const mockServer = {
        loadAccount: vi.fn().mockImplementation((addr: string) => {
          return Promise.resolve({
            balances: [
              { asset_type: 'native', balance: '100' },
              {
                asset_type: 'credit_alphanum4',
                asset_code: 'USDC',
                asset_issuer: USDC_ISSUER,
                balance: '500',
              },
            ],
          });
        }),
      } as any;

      const result = await checkWalletReadiness({
        uid: 'guest-uid',
        apartmentId: 'apt-1',
        server: mockServer,
      });

      expect(result.ready).toBe(false);
      expect(result.guest.wallet).toBeNull();
      expect(result.guest.checks.registeredWallet.ok).toBe(false);
      expect(result.guest.checks.registeredWallet.fix).toBe('LINK_WALLET');
      expect(result.guest.checks.accountExists).toBeUndefined();
      // Counterparties can still be checked
      expect(result.counterparties.hostCanReceive.ok).toBe(true);
      expect(result.counterparties.platformCanReceive.ok).toBe(true);
      // GUEST wallet was not passed to mockServer
      expect(mockServer.loadAccount).not.toHaveBeenCalledWith(GUEST_WALLET);
    });

    it('blocks ready when host cannot receive USDC trustline', async () => {
      vi.mocked(hasuraRequest).mockResolvedValue({
        user_wallets: [{ wallet_address: GUEST_WALLET }],
      });
      vi.mocked(getApartmentEscrowTerms).mockResolvedValue({
        apartmentId: 'apt-1',
        ownerUserId: 'host-uid',
        receiverAddress: HOST_WALLET,
        amount: 250,
      });

      const mockServer = {
        loadAccount: vi.fn().mockImplementation((addr: string) => {
          if (addr === GUEST_WALLET) {
            return Promise.resolve({
              subentry_count: 1,
              balances: [
                { asset_type: 'native', balance: '100' },
                {
                  asset_type: 'credit_alphanum4',
                  asset_code: 'USDC',
                  asset_issuer: USDC_ISSUER,
                  balance: '500',
                },
              ],
            });
          }
          if (addr === HOST_WALLET) {
            // Host account exists but has NO USDC trustline
            return Promise.resolve({
              subentry_count: 0,
              balances: [{ asset_type: 'native', balance: '100' }],
            });
          }
          if (addr === PLATFORM_WALLET) {
            return Promise.resolve({
              subentry_count: 1,
              balances: [
                {
                  asset_type: 'credit_alphanum4',
                  asset_code: 'USDC',
                  asset_issuer: USDC_ISSUER,
                  balance: '0',
                },
              ],
            });
          }
        }),
      } as any;

      const result = await checkWalletReadiness({
        uid: 'guest-uid',
        apartmentId: 'apt-1',
        server: mockServer,
      });

      expect(result.ready).toBe(false);
      expect(result.counterparties.hostCanReceive.ok).toBe(false);
      expect(result.counterparties.platformCanReceive.ok).toBe(true);
      // Never returns host balances
      expect((result.counterparties.hostCanReceive as any).balance).toBeUndefined();
    });

    it('passes and returns ready: true when all checks pass', async () => {
      vi.mocked(hasuraRequest).mockResolvedValue({
        user_wallets: [{ wallet_address: GUEST_WALLET }],
      });
      vi.mocked(getApartmentEscrowTerms).mockResolvedValue({
        apartmentId: 'apt-1',
        ownerUserId: 'host-uid',
        receiverAddress: HOST_WALLET,
        amount: 150,
      });

      const mockServer = {
        loadAccount: vi.fn().mockResolvedValue({
          subentry_count: 1,
          balances: [
            { asset_type: 'native', balance: '50.0000000' },
            {
              asset_type: 'credit_alphanum4',
              asset_code: 'USDC',
              asset_issuer: USDC_ISSUER,
              balance: '300.0000000',
            },
          ],
        }),
      } as any;

      const result = await checkWalletReadiness({
        uid: 'guest-uid',
        apartmentId: 'apt-1',
        server: mockServer,
      });

      expect(result.ready).toBe(true);
      expect(result.network).toBe('testnet');
      expect(result.amount).toBe('150.0000000');
      expect(result.guest.wallet).toBe(GUEST_WALLET);
      expect(result.guest.checks.registeredWallet.ok).toBe(true);
      expect(result.guest.checks.accountExists?.ok).toBe(true);
      expect(result.guest.checks.xlmForFees?.ok).toBe(true);
      expect(result.guest.checks.trustline?.ok).toBe(true);
      expect(result.guest.checks.assetBalance?.ok).toBe(true);
      expect(result.counterparties.hostCanReceive.ok).toBe(true);
      expect(result.counterparties.platformCanReceive.ok).toBe(true);
    });
  });

  describe('buildChangeTrustXdr', () => {
    it('builds a valid changeTrust XDR with caller wallet as source and exact USDC issuer', async () => {
      const mockServer = {
        loadAccount: vi.fn().mockResolvedValue({
          sequence: '1000',
        }),
      } as any;

      const unsignedXdr = await buildChangeTrustXdr(
        mockServer,
        GUEST_WALLET,
        USDC_ISSUER,
        Networks.TESTNET,
      );

      expect(typeof unsignedXdr).toBe('string');
      expect(unsignedXdr.length).toBeGreaterThan(50);
      expect(mockServer.loadAccount).toHaveBeenCalledWith(GUEST_WALLET);
    });

    it('throws 400 ACCOUNT_NOT_FOUND when caller account does not exist on Horizon', async () => {
      const mockServer = {
        loadAccount: vi.fn().mockRejectedValue({ response: { status: 404 } }),
      } as any;

      await expect(
        buildChangeTrustXdr(mockServer, GUEST_WALLET, USDC_ISSUER, Networks.TESTNET),
      ).rejects.toMatchObject({
        status: 400,
        code: 'ACCOUNT_NOT_FOUND',
      });
    });
  });
});
