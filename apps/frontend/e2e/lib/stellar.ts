/**
 * Stellar testnet helpers: sign in the Node process, confirm on Horizon, read
 * USDC balances, and build explorer links.
 */

import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";
import { e2eConfig } from "./env";

export const EXPLORER = "https://stellar.expert/explorer/testnet";
export const txLink = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const contractLink = (contractId: string) => `${EXPLORER}/contract/${contractId}`;
export const accountLink = (address: string) => `${EXPLORER}/account/${address}`;

/** Signs an unsigned XDR with a test secret. The secret never reaches a browser. */
export function signXdr(unsignedXdr: string, secret: string, networkPassphrase?: string): string {
  const passphrase = networkPassphrase ?? e2eConfig().networkPassphrase;
  const tx = TransactionBuilder.fromXDR(unsignedXdr, passphrase);
  tx.sign(Keypair.fromSecret(secret));
  return tx.toXDR();
}

/** Waits until Horizon has the transaction and fails if the ledger rejected it. */
export async function waitForLedger(txHash: string, timeoutMs = 90_000): Promise<{ ledger: number }> {
  const { horizonUrl } = e2eConfig();
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${horizonUrl}/transactions/${txHash}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const body = (await res.json()) as { successful?: boolean; ledger?: number; result_xdr?: string };
        if (body.successful === false) {
          throw new Error(`[stellar] transaction ${txHash} failed on the ledger (${txLink(txHash)})`);
        }
        if (body.successful === true) return { ledger: Number(body.ledger ?? 0) };
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("failed on the ledger")) throw err;
      // Not indexed yet, or a transient Horizon error: retry.
    }
    await new Promise((r) => setTimeout(r, 3_000));
  }
  throw new Error(`[stellar] transaction ${txHash} not on the ledger after ${timeoutMs / 1000} s (${txLink(txHash)})`);
}

/** USDC balance in stroops (1 USDC = 10^7) so comparisons are exact. */
export async function usdcBalanceStroops(address: string): Promise<bigint> {
  const { horizonUrl, usdcIssuer } = e2eConfig();
  const res = await fetch(`${horizonUrl}/accounts/${address}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`[stellar] cannot load account ${address}: HTTP ${res.status}`);
  const body = (await res.json()) as {
    balances: Array<{ asset_code?: string; asset_issuer?: string; balance: string }>;
  };
  const line = body.balances.find((b) => b.asset_code === "USDC" && b.asset_issuer === usdcIssuer);
  if (!line) throw new Error(`[stellar] ${address} has no USDC trustline for ${usdcIssuer}`);
  return toStroops(line.balance);
}

export function toStroops(amount: string | number): bigint {
  // toFixed avoids exponent notation (String(1e-7) === "1e-7").
  const text = typeof amount === "number" ? amount.toFixed(7) : amount.trim();
  const negative = text.startsWith("-");
  const [whole, frac = ""] = text.replace(/^[-+]/, "").split(".");
  const stroops = BigInt(whole || "0") * 10_000_000n + BigInt((frac + "0000000").slice(0, 7));
  return negative ? -stroops : stroops;
}

export function fromStroops(stroops: bigint): string {
  const sign = stroops < 0n ? "-" : "";
  const abs = stroops < 0n ? -stroops : stroops;
  return `${sign}${abs / 10_000_000n}.${(abs % 10_000_000n).toString().padStart(7, "0")}`;
}

/**
 * True when `received` equals `expected` less at most `tolerance` of it — the
 * Trustless Work protocol fee on payouts. The platform fee is 0.
 */
export function paidOut(received: bigint, expected: bigint, tolerance: number): boolean {
  const maxFee = (expected * BigInt(Math.round(tolerance * 1_000_000))) / 1_000_000n;
  return received <= expected && received >= expected - maxFee;
}

export const publicKeyOf =(secret: string) => Keypair.fromSecret(secret).publicKey();
