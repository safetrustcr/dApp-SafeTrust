import {
  Account,
  Asset,
  Horizon,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { ApiError } from '../http/api-error.js';
import { hasuraRequest } from './hasura.js';
import { getApartmentEscrowTerms, ApartmentTermsError } from './apartment-escrow-terms.js';
import { getHotelReservationEscrowTerms } from './hotel-reservation-escrow.js';
import { getUserWallets } from './escrow-authz.js';
import { NETWORK_PASSPHRASE } from '../lib/stellar-xdr.js';

export const XLM_BASE_RESERVE = 0.5;
export const XLM_FEE_BUFFER = 1.0;
export const HORIZON_CACHE_TTL_MS = 15_000;

const STELLAR_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

/**
 * Minimum XLM required to cover Stellar base reserve + subentries + fee buffer:
 * ((2 + subentries) × 0.5 XLM) + 1 XLM.
 */
export function calculateXlmThreshold(subentryCount: number): number {
  return (2 + subentryCount) * XLM_BASE_RESERVE + XLM_FEE_BUFFER;
}

export function getHorizonServerUrl(): string {
  if (process.env.STELLAR_HORIZON_URL?.trim()) {
    return process.env.STELLAR_HORIZON_URL.trim().replace(/\/+$/, '');
  }
  const isPublic =
    process.env.STELLAR_NETWORK === 'PUBLIC' ||
    process.env.STELLAR_NETWORK_PASSPHRASE === Networks.PUBLIC;
  return isPublic
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';
}

export function isTestnet(): boolean {
  const network = (process.env.STELLAR_NETWORK || '').toLowerCase();
  const passphrase = process.env.STELLAR_NETWORK_PASSPHRASE || '';
  if (network === 'public' || network === 'mainnet' || passphrase === Networks.PUBLIC) {
    return false;
  }
  return true;
}

type CachedAccount = {
  data: Horizon.ServerApi.AccountRecord | null;
  expiresAt: number;
};

const horizonAccountCache = new Map<string, CachedAccount>();

export function clearHorizonCache(): void {
  horizonAccountCache.clear();
}

/**
 * Loads account data from Horizon with a 15-second per-address in-memory cache.
 * Returns null if account does not exist (404).
 */
export async function loadAccountWithCache(
  server: Horizon.Server,
  address: string,
  options?: { skipCache?: boolean },
): Promise<Horizon.ServerApi.AccountRecord | null> {
  const now = Date.now();
  if (!options?.skipCache) {
    const cached = horizonAccountCache.get(address);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  }

  try {
    const account = await server.loadAccount(address);
    horizonAccountCache.set(address, {
      data: account,
      expiresAt: now + HORIZON_CACHE_TTL_MS,
    });
    return account;
  } catch (error: unknown) {
    const status =
      (error as { response?: { status?: number }; status?: number })?.response?.status ??
      (error as { status?: number })?.status;

    if (status === 404) {
      horizonAccountCache.set(address, {
        data: null,
        expiresAt: now + HORIZON_CACHE_TTL_MS,
      });
      return null;
    }

    throw new ApiError(
      503,
      'HORIZON_UNAVAILABLE',
      "Can't check your wallet right now. Try again.",
      { retryable: true },
    );
  }
}

export function hasUsdcTrustline(
  account: Horizon.ServerApi.AccountRecord | null,
  assetCode: string,
  assetIssuer: string,
): boolean {
  if (!account || !Array.isArray(account.balances)) return false;
  return account.balances.some(
    (b) =>
      b.asset_type !== 'native' &&
      'asset_code' in b &&
      'asset_issuer' in b &&
      b.asset_code === assetCode &&
      b.asset_issuer === assetIssuer,
  );
}

export function getUsdcBalance(
  account: Horizon.ServerApi.AccountRecord | null,
  assetCode: string,
  assetIssuer: string,
): string {
  if (!account || !Array.isArray(account.balances)) return '0';
  const entry = account.balances.find(
    (b) =>
      b.asset_type !== 'native' &&
      'asset_code' in b &&
      'asset_issuer' in b &&
      b.asset_code === assetCode &&
      b.asset_issuer === assetIssuer,
  );
  return entry?.balance ?? '0';
}

export function getNativeXlmBalance(
  account: Horizon.ServerApi.AccountRecord | null,
): string {
  if (!account || !Array.isArray(account.balances)) return '0';
  const native = account.balances.find((b) => b.asset_type === 'native');
  return native?.balance ?? '0';
}

export type ReadinessCheck = {
  ok: boolean;
  balance?: string;
  required?: string;
  fix?: string;
};

export type GuestChecks = {
  registeredWallet: { ok: boolean; fix?: string };
  accountExists?: { ok: boolean; fix?: string };
  xlmForFees?: { ok: boolean; balance: string; required?: string; fix?: string };
  trustline?: { ok: boolean; fix?: string };
  assetBalance?: { ok: boolean; balance: string; required: string; fix?: string };
};

export type WalletReadinessResponse = {
  ready: boolean;
  network: 'testnet' | 'mainnet';
  asset: {
    code: string;
    issuer: string;
  };
  amount: string;
  guest: {
    wallet: string | null;
    checks: GuestChecks;
  };
  counterparties: {
    hostCanReceive: { ok: boolean };
    platformCanReceive: { ok: boolean };
  };
};

export function evaluateGuestChecks(
  account: Horizon.ServerApi.AccountRecord | null,
  amount: number | string,
  assetIssuer: string,
  isTestnetNetwork: boolean,
): GuestChecks {
  const amountStr = Number(amount).toFixed(7);

  if (!account) {
    return {
      registeredWallet: { ok: true },
      accountExists: {
        ok: false,
        ...(isTestnetNetwork ? { fix: 'FUND_XLM' } : {}),
      },
      xlmForFees: {
        ok: false,
        balance: '0',
        ...(isTestnetNetwork ? { fix: 'FUND_XLM' } : {}),
      },
      trustline: {
        ok: false,
        fix: 'ADD_TRUSTLINE',
      },
      assetBalance: {
        ok: false,
        balance: '0',
        required: amountStr,
        ...(isTestnetNetwork ? { fix: 'GET_TEST_USDC' } : {}),
      },
    };
  }

  const subentries = account.subentry_count ?? 0;
  const xlmThreshold = calculateXlmThreshold(subentries);
  const nativeBalance = getNativeXlmBalance(account);
  const nativeBalanceNum = parseFloat(nativeBalance);
  const xlmOk = nativeBalanceNum >= xlmThreshold;

  const trustlineOk = hasUsdcTrustline(account, 'USDC', assetIssuer);
  const usdcBal = trustlineOk ? getUsdcBalance(account, 'USDC', assetIssuer) : '0';
  const usdcBalNum = parseFloat(usdcBal);
  const requiredAmountNum = parseFloat(String(amount));
  const assetBalanceOk = trustlineOk && usdcBalNum >= requiredAmountNum;

  return {
    registeredWallet: { ok: true },
    accountExists: { ok: true },
    xlmForFees: {
      ok: xlmOk,
      balance: nativeBalance,
      ...(!xlmOk && isTestnetNetwork ? { fix: 'FUND_XLM' } : {}),
    },
    trustline: {
      ok: trustlineOk,
      ...(!trustlineOk ? { fix: 'ADD_TRUSTLINE' } : {}),
    },
    assetBalance: {
      ok: assetBalanceOk,
      balance: usdcBal,
      required: amountStr,
      ...(!assetBalanceOk && isTestnetNetwork ? { fix: 'GET_TEST_USDC' } : {}),
    },
  };
}

export async function getGuestPrimaryWallet(uid: string): Promise<string | null> {
  const data = await hasuraRequest<{ user_wallets: Array<{ wallet_address: string }> }>(
    `query GuestPrimaryWallet($uid: String!) {
       user_wallets(where: { user_id: { _eq: $uid }, is_primary: { _eq: true } }, limit: 1) {
         wallet_address
       }
     }`,
    { uid },
  );
  return data.user_wallets[0]?.wallet_address ?? null;
}

export type EscrowReadinessParams = {
  uid: string;
  apartmentId?: string;
  reservationId?: string;
  server?: Horizon.Server;
};

export async function checkWalletReadiness({
  uid,
  apartmentId,
  reservationId,
  server,
}: EscrowReadinessParams): Promise<WalletReadinessResponse> {
  const platformAddress = process.env.PLATFORM_STELLAR_ADDRESS;
  const usdcIssuer = process.env.USDC_TRUSTLINE_ADDRESS;
  if (!platformAddress || !usdcIssuer) {
    throw new ApiError(503, 'AUTH_NOT_CONFIGURED', 'Authentication is temporarily unavailable.', {
      retryable: true,
    });
  }

  // Resolve terms via server resolvers
  let amount = 0;
  let receiverAddress = '';
  let hotelGuestWallet: string | null = null;

  if (apartmentId) {
    try {
      const terms = await getApartmentEscrowTerms(apartmentId);
      if (terms.ownerUserId === uid) {
        throw new ApiError(
          409,
          'SELF_ESCROW_NOT_ALLOWED',
          'You cannot create a rental escrow for your own apartment.',
        );
      }
      amount = terms.amount;
      receiverAddress = terms.receiverAddress;
    } catch (error) {
      if (error instanceof ApartmentTermsError) {
        if (error.code === 'HOST_WALLET_MISSING') {
          // Apartment exists, but host has not linked wallet.
          const aptData = await hasuraRequest<{
            apartments_by_pk: { warranty_deposit: number | string | null } | null;
          }>(
            `query AptAmount($id: uuid!) { apartments_by_pk(id: $id) { warranty_deposit } }`,
            { id: apartmentId },
          );
          amount = Number(aptData.apartments_by_pk?.warranty_deposit || 0);
          receiverAddress = '';
        } else {
          throw new ApiError(error.status, error.code, error.message);
        }
      } else {
        throw error;
      }
    }
  } else if (reservationId) {
    try {
      const hotelTerms = await getHotelReservationEscrowTerms(reservationId, uid);
      amount = hotelTerms.amount;
      receiverAddress = hotelTerms.receiverAddress;
      hotelGuestWallet = hotelTerms.senderAddress;
    } catch (error) {
      if (error instanceof ApiError && error.code === 'HOST_WALLET_MISSING') {
        const resData = await hasuraRequest<{
          reservations_by_pk: { total_amount: number | string | null } | null;
        }>(
          `query ResAmount($id: uuid!) { reservations_by_pk(id: $id) { total_amount } }`,
          { id: reservationId },
        );
        amount = Number(resData.reservations_by_pk?.total_amount || 0);
        receiverAddress = '';
      } else {
        throw error;
      }
    }
  }

  const horizon = server ?? new Horizon.Server(getHorizonServerUrl());
  const isTestnetNetwork = isTestnet();
  const networkName: 'testnet' | 'mainnet' = isTestnetNetwork ? 'testnet' : 'mainnet';
  const amountStr = Number(amount).toFixed(7);

  // Check guest primary registered wallet
  let guestWallet = await getGuestPrimaryWallet(uid);
  if (!guestWallet && hotelGuestWallet) {
    guestWallet = hotelGuestWallet;
  }

  let guestChecks: GuestChecks;

  if (!guestWallet) {
    // Skip Horizon checks when registered wallet is missing
    guestChecks = {
      registeredWallet: {
        ok: false,
        fix: 'LINK_WALLET',
      },
    };
  } else {
    const guestAccount = await loadAccountWithCache(horizon, guestWallet);
    guestChecks = evaluateGuestChecks(guestAccount, amount, usdcIssuer, isTestnetNetwork);
  }

  // Check counterparties (host & platform USDC trustlines)
  let hostCanReceiveOk = false;
  if (receiverAddress && STELLAR_ADDRESS_REGEX.test(receiverAddress)) {
    const hostAccount = await loadAccountWithCache(horizon, receiverAddress);
    hostCanReceiveOk = hasUsdcTrustline(hostAccount, 'USDC', usdcIssuer);
  }

  let platformCanReceiveOk = false;
  if (platformAddress && STELLAR_ADDRESS_REGEX.test(platformAddress)) {
    const platformAccount = await loadAccountWithCache(horizon, platformAddress);
    platformCanReceiveOk = hasUsdcTrustline(platformAccount, 'USDC', usdcIssuer);
  }

  const isGuestReady =
    guestChecks.registeredWallet.ok &&
    Boolean(guestChecks.accountExists?.ok) &&
    Boolean(guestChecks.xlmForFees?.ok) &&
    Boolean(guestChecks.trustline?.ok) &&
    Boolean(guestChecks.assetBalance?.ok);

  const ready = isGuestReady && hostCanReceiveOk && platformCanReceiveOk;

  return {
    ready,
    network: networkName,
    asset: {
      code: 'USDC',
      issuer: usdcIssuer,
    },
    amount: amountStr,
    guest: {
      wallet: guestWallet,
      checks: guestChecks,
    },
    counterparties: {
      hostCanReceive: { ok: hostCanReceiveOk },
      platformCanReceive: { ok: platformCanReceiveOk },
    },
  };
}

/**
 * Builds an unsigned changeTrust transaction for USDC with the caller's registered wallet.
 */
export async function buildChangeTrustXdr(
  server: Horizon.Server,
  callerWallet: string,
  assetIssuer: string,
  passphrase = NETWORK_PASSPHRASE,
): Promise<string> {
  let accountRecord: Horizon.ServerApi.AccountRecord | null;
  try {
    accountRecord = await server.loadAccount(callerWallet);
  } catch (err: unknown) {
    const status =
      (err as { response?: { status?: number }; status?: number })?.response?.status ??
      (err as { status?: number })?.status;

    if (status === 404) {
      throw new ApiError(
        400,
        'ACCOUNT_NOT_FOUND',
        'Account must be funded with XLM before adding a trustline.',
      );
    }
    throw new ApiError(
      503,
      'HORIZON_UNAVAILABLE',
      "Can't check your wallet right now. Try again.",
      { retryable: true },
    );
  }

  const sourceAccount = new Account(callerWallet, accountRecord.sequence);
  const asset = new Asset('USDC', assetIssuer);
  const tx = new TransactionBuilder(sourceAccount, {
    fee: '10000',
    networkPassphrase: passphrase,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(300)
    .build();

  return tx.toXDR();
}
