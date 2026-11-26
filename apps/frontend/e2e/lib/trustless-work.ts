/**
 * Trustless Work testnet access for the E2E specs, under its rate limit.
 *
 * Trustless Work allows 50 requests per 60 s per API key. The suite shares the
 * key with apps/api, so every request the specs *cause* (a build or submit via
 * apps/api, or a direct escrow lookup here) takes a slot from one sliding
 * window. The default budget (E2E_TW_RATE_BUDGET=40) leaves headroom for
 * anything else using the key. Specs run one at a time (workers: 1), so the
 * window is shared by the whole run inside one worker process.
 */

import { e2eConfig } from "./env";

const WINDOW_MS = 60_000;
const calls: number[] = [];

/** Waits until `count` Trustless Work requests fit in the 60 s window, then reserves them. */
export async function reserveTrustlessWorkCalls(count: number, label: string): Promise<void> {
  const budget = e2eConfig().trustlessWorkBudget;
  if (count > budget) throw new Error(`[tw] ${label} needs ${count} requests; budget is ${budget}.`);
  for (;;) {
    const now = Date.now();
    while (calls.length > 0 && now - calls[0] >= WINDOW_MS) calls.shift();
    if (calls.length + count <= budget) {
      for (let i = 0; i < count; i += 1) calls.push(now);
      return;
    }
    const waitMs = WINDOW_MS - (now - calls[0]) + 250;
    console.log(`[tw] rate budget reached (${calls.length}/${budget} in 60 s); waiting ${Math.ceil(waitMs / 1000)} s before ${label}`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
}

/** Requests reserved in the current 60 s window, for logging. */
export function trustlessWorkCallsInWindow(): number {
  const now = Date.now();
  return calls.filter((t) => now - t < WINDOW_MS).length;
}

/** The parts of a Trustless Work single-release escrow the specs assert on. */
export type TwEscrowState = {
  contractId: string;
  engagementId?: string;
  balance: number | null;
  amount: number | null;
  milestone: { status: string | null; approved: boolean };
  flags: { disputed: boolean; released: boolean; resolved: boolean };
  raw: Record<string, unknown>;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Accepts both the current (`flags.disputed`) and older (`flags.disputeFlag`) response shapes. */
export function normalizeEscrow(raw: Record<string, unknown>): TwEscrowState {
  const flags = (raw.flags ?? {}) as Record<string, unknown>;
  const milestones = Array.isArray(raw.milestones) ? (raw.milestones as Record<string, unknown>[]) : [];
  const m = milestones[0] ?? {};
  const mFlags = (m.flags ?? {}) as Record<string, unknown>;
  const bool = (...values: unknown[]) => values.some((v) => v === true);
  return {
    contractId: String(raw.contractId ?? raw.contract_id ?? ""),
    engagementId: typeof raw.engagementId === "string" ? raw.engagementId : undefined,
    balance: toNumber(raw.balance),
    amount: toNumber(raw.amount),
    milestone: {
      status: typeof m.status === "string" ? m.status : null,
      approved: bool(m.approved, m.approvedFlag, mFlags.approved),
    },
    flags: {
      disputed: bool(flags.disputed, flags.disputeFlag, raw.disputed),
      released: bool(flags.released, flags.releaseFlag, raw.released),
      resolved: bool(flags.resolved, flags.resolvedFlag, raw.resolved),
    },
    raw,
  };
}

/**
 * GET /helper/get-escrow-by-contract-ids?contractIds[]=C…&validateOnChain=true
 *
 * validateOnChain makes Trustless Work read the contract state from the
 * ledger instead of returning only its indexer copy.
 */
export async function getEscrowOnChain(contractId: string): Promise<TwEscrowState | null> {
  const cfg = e2eConfig();
  await reserveTrustlessWorkCalls(1, `get-escrow ${contractId.slice(0, 8)}`);

  const params = new URLSearchParams();
  params.append("contractIds[]", contractId);
  params.append("validateOnChain", "true");
  const res = await fetch(`${cfg.trustlessWorkUrl}/helper/get-escrow-by-contract-ids?${params}`, {
    headers: { "x-api-key": cfg.trustlessWorkApiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`[tw] get-escrow-by-contract-ids → HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const body = text ? (JSON.parse(text) as unknown) : null;
  const list: unknown[] = Array.isArray(body)
    ? body
    : Array.isArray((body as { escrows?: unknown[] })?.escrows)
      ? (body as { escrows: unknown[] }).escrows
      : body
        ? [body]
        : [];
  const match = (list as Record<string, unknown>[]).find(
    (e) => e && (e.contractId === contractId || e.contract_id === contractId),
  ) ?? (list.length === 1 ? (list[0] as Record<string, unknown>) : undefined);
  return match ? normalizeEscrow(match) : null;
}

/**
 * Polls the on-chain escrow until `predicate` holds. Each attempt costs one
 * Trustless Work request, so attempts are few and spaced out.
 */
export async function waitForEscrowOnChain(
  contractId: string,
  predicate: (e: TwEscrowState) => boolean,
  description: string,
  { attempts = 6, intervalMs = 5_000 } = {},
): Promise<TwEscrowState> {
  let last: TwEscrowState | null = null;
  for (let i = 1; i <= attempts; i += 1) {
    last = await getEscrowOnChain(contractId);
    if (last && predicate(last)) return last;
    if (i < attempts) await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(
    `[tw] escrow ${contractId} never reached "${description}" on chain. Last state: ` +
      JSON.stringify(last ? { ...last, raw: undefined } : null),
  );
}
