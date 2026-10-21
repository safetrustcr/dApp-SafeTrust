import { REQUEST_TIMEOUT_MS, assertTestnetHorizon } from '../config.js';

/**
 * Read-only Stellar Horizon lookups (Testnet only). The MCP never builds,
 * signs or submits anything here — it only asks whether an account exists,
 * which trustlines it holds, and whether a transaction landed.
 */

export type AccountSnapshot =
  | { exists: false }
  | {
      exists: true;
      xlm: number;
      /** USDC trustline for the configured issuer, or null when there is none. */
      usdc: { balance: number; limit: number } | null;
    };

type HorizonBalance = {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
  limit?: string;
};

export async function getAccount(address: string, usdcIssuer: string): Promise<AccountSnapshot> {
  const base = assertTestnetHorizon();
  const res = await fetch(`${base}/accounts/${encodeURIComponent(address)}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { Accept: 'application/json' },
  });
  if (res.status === 404) return { exists: false };
  if (!res.ok) throw new Error(`Horizon returned ${res.status} for account ${address.slice(0, 4)}…`);
  const body = (await res.json()) as { balances?: HorizonBalance[] };
  const balances = body.balances ?? [];
  const native = balances.find((b) => b.asset_type === 'native');
  const usdc = balances.find((b) => b.asset_code === 'USDC' && b.asset_issuer === usdcIssuer);
  return {
    exists: true,
    xlm: Number(native?.balance ?? 0),
    usdc: usdc ? { balance: Number(usdc.balance), limit: Number(usdc.limit ?? 0) } : null,
  };
}

export type ChainStatus = 'success' | 'failed' | 'not_found' | 'unknown';

/** Same question apps/api's reconciler asks (services/stellar-confirm.ts). */
export async function getTransactionStatus(txHash: string): Promise<{ status: ChainStatus; ledgerClosedAt?: string }> {
  try {
    const base = assertTestnetHorizon();
    const res = await fetch(`${base}/transactions/${encodeURIComponent(txHash)}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
    if (res.status === 404) return { status: 'not_found' };
    if (!res.ok) return { status: 'unknown' };
    const body = (await res.json()) as { successful?: boolean; created_at?: string };
    if (typeof body.successful !== 'boolean') return { status: 'unknown' };
    return { status: body.successful ? 'success' : 'failed', ledgerClosedAt: body.created_at };
  } catch {
    return { status: 'unknown' };
  }
}
