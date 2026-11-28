/**
 * GET /api/escrow/readiness (apps/api, #507) — the wallet readiness checks the
 * app itself shows a guest before they create an escrow. get-wallet-readiness
 * asks apps/api first, so the answer is the one the guest sees; the MCP's own
 * read-only checks (booking.ts readinessChecks) are only a fallback while the
 * MCP cannot call authenticated routes.
 */
import { redactWallet } from './redact.js';

type Check = { ok: boolean; balance?: string; required?: string; fix?: string };

/** Response of GET /api/escrow/readiness (apps/api WalletReadinessResponse). */
export type ApiReadiness = {
  ready: boolean;
  network: 'testnet' | 'mainnet';
  asset: { code: string; issuer: string };
  amount: string;
  guest: {
    wallet: string | null;
    checks: {
      registeredWallet: Check;
      accountExists?: Check;
      xlmForFees?: Check;
      trustline?: Check;
      assetBalance?: Check;
    };
  };
  counterparties: {
    hostCanReceive: { ok: boolean };
    platformCanReceive: { ok: boolean };
  };
};

/** What each apps/api fix code asks the guest (or a contributor) to do. */
export const FIX_HINTS: Record<string, string> = {
  LINK_WALLET: 'Connect and register the Stellar wallet that will sign this escrow (wallet settings in the app).',
  FUND_XLM: 'Fund the wallet with Testnet XLM from Friendbot (https://friendbot.stellar.org/?addr=<wallet>).',
  ADD_TRUSTLINE: 'Add the USDC trustline — the app builds it via POST /api/escrow/readiness/trustline for the guest to sign.',
  GET_TEST_USDC: 'Get Testnet USDC for this issuer (e.g. the Circle Testnet faucet) until the balance covers the amount.',
};

const CHECK_LABELS: Array<[keyof ApiReadiness['guest']['checks'], string]> = [
  ['registeredWallet', 'guest wallet registered'],
  ['accountExists', 'guest account exists on chain'],
  ['xlmForFees', 'guest holds XLM for reserves and fees'],
  ['trustline', 'guest has the USDC trustline'],
  ['assetBalance', 'guest holds enough USDC'],
];

function amounts(check: Check): string {
  if (check.balance === undefined) return '';
  return check.required !== undefined
    ? ` (balance ${check.balance}, needs ${check.required})`
    : ` (balance ${check.balance})`;
}

/** Plain-language lines for an apps/api readiness response. Wallets are redacted. */
export function formatApiReadiness(data: ApiReadiness): string[] {
  const lines: string[] = [];
  const failing: string[] = [];

  lines.push(
    data.ready ? 'Ready: apps/api reports this booking can be escrowed.' : 'Not ready: apps/api reports blocking checks.',
    `source: GET /api/escrow/readiness (${data.network})`,
    `amount: ${data.amount} ${data.asset.code} (issuer ${redactWallet(data.asset.issuer)})`,
    `guest wallet: ${redactWallet(data.guest.wallet) ?? '(none registered)'}`,
    '',
  );

  for (const [key, label] of CHECK_LABELS) {
    const check = data.guest.checks[key];
    if (!check) {
      // apps/api skips the on-chain checks until a wallet is registered.
      lines.push(`➖ ${label}: not checked`);
      continue;
    }
    lines.push(`${check.ok ? '✅' : '❌'} ${label}${amounts(check)}`);
    if (!check.ok) {
      failing.push(label);
      if (check.fix) lines.push(`   fix (${check.fix}): ${FIX_HINTS[check.fix] ?? 'see the app’s readiness checklist'}`);
    }
  }

  const { hostCanReceive, platformCanReceive } = data.counterparties;
  lines.push(`${hostCanReceive.ok ? '✅' : '❌'} host wallet can receive ${data.asset.code}`);
  if (!hostCanReceive.ok) {
    failing.push('host wallet');
    lines.push('   fix: the host links a wallet and adds the USDC trustline; the guest cannot fix this.');
  }
  lines.push(`${platformCanReceive.ok ? '✅' : '❌'} platform wallet can receive ${data.asset.code}`);
  if (!platformCanReceive.ok) {
    failing.push('platform wallet');
    lines.push('   fix: operator issue — PLATFORM_STELLAR_ADDRESS needs a funded account with the USDC trustline.');
  }

  if (!data.ready && failing.length === 0) {
    lines.push('', 'apps/api says not ready but no individual check failed — compare with the app’s checklist.');
  }
  return lines;
}

/** Narrow an untyped body to the readiness shape before formatting it. */
export function isApiReadiness(value: unknown): value is ApiReadiness {
  const v = value as Partial<ApiReadiness> | null;
  return (
    !!v &&
    typeof v.ready === 'boolean' &&
    typeof v.amount === 'string' &&
    !!v.asset &&
    !!v.guest &&
    !!v.guest.checks &&
    !!v.counterparties
  );
}
