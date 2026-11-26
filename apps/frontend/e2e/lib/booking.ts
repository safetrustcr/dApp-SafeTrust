/**
 * Drives one real testnet booking through apps/api, the way the web app does:
 *
 *   POST /api/escrow/<action>   (Firebase token + Idempotency-Key) → unsigned XDR
 *   sign the XDR with the role's test secret
 *   POST /api/escrow/send-transaction { signedXdr } → Trustless Work → Stellar
 *   wait for the ledger, then check SafeTrust and Trustless Work
 *
 * Every submitted transaction is recorded so the run can print explorer links.
 */

import { randomUUID } from "node:crypto";
import { e2eConfig } from "./env";
import { signIn, type SignedInUser } from "./firebase-auth";
import { reserveTrustlessWorkCalls, trustlessWorkCallsInWindow } from "./trustless-work";
import { contractLink, publicKeyOf, signXdr, txLink, waitForLedger } from "./stellar";

export type Actor = SignedInUser & { role: "guest" | "host" | "admin"; secret: string; address: string };

export async function signInActors(): Promise<{ guest: Actor; host: Actor; admin: Actor }> {
  const { users } = e2eConfig();
  const make = async (role: Actor["role"]): Promise<Actor> => {
    const u = users[role];
    const session = await signIn(u.email);
    return { ...session, role, secret: u.secret, address: publicKeyOf(u.secret) };
  };
  return { guest: await make("guest"), host: await make("host"), admin: await make("admin") };
}

export type ApiResponse<T = Record<string, unknown>> = { status: number; body: T };

/** POST to apps/api as `actor`, with a fresh Idempotency-Key unless one is given. */
export async function apiPost<T = Record<string, unknown>>(
  actor: Actor,
  path: string,
  body: unknown,
  idempotencyKey: string = randomUUID(),
): Promise<ApiResponse<T>> {
  const { apiUrl } = e2eConfig();
  const res = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${actor.idToken}`,
      "Idempotency-Key": idempotencyKey,
      "X-Tenant-ID": "safetrust",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const text = await res.text();
  let parsed: unknown = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }
  return { status: res.status, body: parsed as T };
}

export type TxRecord = { step: string; action: string; actor: string; txHash: string; ledger: number };

type BuildBody = {
  unsignedXdr?: string;
  unsignedXDR?: string;
  networkPassphrase?: string;
  txHash?: string;
  engagementId?: string;
  contractId?: string | null;
  reused?: boolean;
  status?: string;
};

type SubmitBody = { txHash: string; status: string; action: string; contractId?: string | null; replay?: boolean };

export class Booking {
  engagementId = "";
  contractId = "";
  readonly txs: TxRecord[] = [];
  /** Last signed XDR per action, kept for the idempotent re-submit check. */
  readonly signed = new Map<string, { actor: Actor; signedXdr: string }>();

  constructor(readonly label: string, readonly apartmentId: string) {}

  /**
   * Build → sign → submit → ledger. Returns the submit response.
   * Each build and each submit is one Trustless Work request.
   */
  async run(step: string, actor: Actor, path: string, body: Record<string, unknown>): Promise<SubmitBody> {
    await reserveTrustlessWorkCalls(1, `${step} (build)`);
    const built = await apiPost<BuildBody>(actor, path, body);
    if (built.status !== 200) {
      throw new Error(`[booking] ${step}: ${path} → HTTP ${built.status} ${JSON.stringify(built.body)}`);
    }
    const unsignedXdr = built.body.unsignedXdr ?? built.body.unsignedXDR;
    if (!unsignedXdr) {
      throw new Error(`[booking] ${step}: ${path} returned no unsigned XDR: ${JSON.stringify(built.body)}`);
    }
    if (built.body.engagementId) this.engagementId = built.body.engagementId;

    const signedXdr = signXdr(unsignedXdr, actor.secret, built.body.networkPassphrase);

    await reserveTrustlessWorkCalls(1, `${step} (submit)`);
    const submitted = await apiPost<SubmitBody>(actor, "/api/escrow/send-transaction", { signedXdr });
    if (submitted.status !== 200) {
      throw new Error(
        `[booking] ${step}: send-transaction → HTTP ${submitted.status} ${JSON.stringify(submitted.body)}`,
      );
    }
    if (submitted.body.contractId) this.contractId = submitted.body.contractId;

    const { ledger } = await waitForLedger(submitted.body.txHash);
    this.txs.push({ step, action: submitted.body.action, actor: actor.role, txHash: submitted.body.txHash, ledger });
    this.signed.set(submitted.body.action, { actor, signedXdr });
    console.log(
      `[booking:${this.label}] ${step} → ${txLink(submitted.body.txHash)} (ledger ${ledger}, ` +
        `${trustlessWorkCallsInWindow()} TW requests in the last 60 s)`,
    );
    return submitted.body;
  }

  /**
   * Runs the reconciliation job the Hasura cron calls every 2 minutes, so the
   * spec doesn't wait for the next tick. It only reads Horizon (no Trustless
   * Work request). Skipped when RECONCILIATION_SECRET is not set.
   */
  async reconcile(): Promise<void> {
    const { apiUrl, reconciliationSecret } = e2eConfig();
    if (!reconciliationSecret) return;
    const res = await fetch(`${apiUrl}/reconciliation/sync-escrows`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-reconciliation-secret": reconciliationSecret },
      body: "{}",
      signal: AbortSignal.timeout(60_000),
    });
    if (res.status !== 200) {
      throw new Error(`[booking] reconciliation → HTTP ${res.status} ${await res.text()} (does RECONCILIATION_SECRET match apps/api?)`);
    }
  }

  /** Markdown table of the run's transactions, for the HTML report and the PR. */
  summary(extra: string[] = []): string {
    const rows = this.txs.map(
      (t) => `| ${t.step} | ${t.actor} | \`${t.action}\` | [${t.txHash.slice(0, 12)}…](${txLink(t.txHash)}) | ${t.ledger} |`,
    );
    return [
      `### ${this.label}`,
      "",
      `- Engagement: \`${this.engagementId}\``,
      `- Contract: [${this.contractId}](${contractLink(this.contractId)})`,
      ...extra.map((line) => `- ${line}`),
      "",
      "| Step | Signer | Action | Transaction | Ledger |",
      "|---|---|---|---|---|",
      ...rows,
      "",
    ].join("\n");
  }
}
