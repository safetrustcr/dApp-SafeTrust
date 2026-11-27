/**
 * Playwright global setup — runs once before any spec.
 *
 * Fails fast with a readable message when the env, the local API, or the
 * testnet accounts are not ready, instead of failing halfway through a
 * booking that has already spent testnet USDC.
 */

import { execSync } from "child_process";
import { Keypair } from "@stellar/stellar-sdk";
import { REQUIRED_ENV, loadE2EEnv, repoRoot } from "./lib/env";

export default async function globalSetup(): Promise<void> {
  loadE2EEnv();
  console.log("[global-setup] Verifying E2E environment…");

  const missing: string[] = REQUIRED_ENV.filter((k) => !process.env[k]?.trim());
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    missing.push("NEXT_PUBLIC_FIREBASE_API_KEY or FIREBASE_AUTH_EMULATOR_HOST");
  }
  if (missing.length > 0) {
    throw new Error(
      `[global-setup] Missing environment variables: ${missing.join(", ")}.\n` +
        "Put them in apps/frontend/.env.e2e.local, .env.testnet.local or apps/api/.env " +
        "(see docs/testnet-booking.md).",
    );
  }

  const platform = Keypair.fromSecret(process.env.E2E_PLATFORM_SECRET!).publicKey();
  if (platform !== process.env.PLATFORM_STELLAR_ADDRESS) {
    throw new Error(
      `[global-setup] PLATFORM_STELLAR_ADDRESS (${process.env.PLATFORM_STELLAR_ADDRESS}) is not the ` +
        `E2E_PLATFORM_SECRET wallet (${platform}). The admin could not resolve disputes.`,
    );
  }

  const apiUrl = (process.env.API_URL ?? "http://localhost:3002").replace(/\/+$/, "");
  try {
    const res = await fetch(`${apiUrl}/health`, { signal: AbortSignal.timeout(5_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    throw new Error(
      `[global-setup] apps/api is not reachable at ${apiUrl}/health (${(err as Error).message}). ` +
        "Start it with `pnpm dev` or set API_URL.",
    );
  }

  // Root workspace script: run it from the repo root, not apps/frontend.
  try {
    execSync("pnpm testnet:provision --check", { cwd: repoRoot, stdio: "inherit", timeout: 60_000 });
  } catch {
    throw new Error(
      "[global-setup] testnet:provision --check failed.\n" +
        "Run `pnpm testnet:provision` to set up accounts, trustlines and users, " +
        "fund the guest with testnet USDC, then retry.",
    );
  }

  console.log("[global-setup] Testnet ready. Starting specs (one at a time)…");
}