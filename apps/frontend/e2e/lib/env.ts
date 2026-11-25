/**
 * E2E environment: loads the local env files and exposes typed settings.
 *
 * Files are read in this order and never override a variable already set in
 * the shell or CI:
 *   apps/frontend/.env.e2e.local   (your E2E settings, git-ignored)
 *   <repo>/.env.testnet.local      (secrets written by `pnpm testnet:provision --generate`)
 *   apps/api/.env                  (API settings: Hasura, Trustless Work, platform address)
 */

import fs from "node:fs";
import path from "node:path";
import { Keypair } from "@stellar/stellar-sdk";

const e2eDir = path.resolve(__dirname, "..");
export const frontendDir = path.resolve(e2eDir, "..");
export const repoRoot = path.resolve(frontendDir, "../..");

const ENV_FILES = [
  path.join(frontendDir, ".env.e2e.local"),
  path.join(repoRoot, ".env.testnet.local"),
  path.join(repoRoot, "apps/api/.env"),
];

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().replace(/^export\s+/, "");
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      // Strip trailing inline comments on unquoted values.
      const hash = value.indexOf(" #");
      if (hash >= 0) value = value.slice(0, hash).trim();
    }
    out[key] = value;
  }
  return out;
}

let loaded = false;

export function loadE2EEnv(): void {
  if (loaded) return;
  loaded = true;
  for (const file of ENV_FILES) {
    if (!fs.existsSync(file)) continue;
    const values = parseEnvFile(fs.readFileSync(file, "utf8"));
    for (const [key, value] of Object.entries(values)) {
      if (process.env[key] === undefined || process.env[key] === "") {
        process.env[key] = value;
      }
    }
  }
}

function env(name: string, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`[e2e] Missing required environment variable ${name}. See docs/testnet-booking.md.`);
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** Variables the testnet specs cannot run without. Checked by global-setup. */
export const REQUIRED_ENV = [
  "E2E_GUEST_SECRET",
  "E2E_HOST_SECRET",
  "E2E_PLATFORM_SECRET",
  "TRUSTLESS_WORK_API_KEY",
  "PLATFORM_STELLAR_ADDRESS",
  "USDC_TRUSTLINE_ADDRESS",
  "HASURA_GRAPHQL_URL",
  "HASURA_ADMIN_SECRET",
] as const;

export type E2EConfig = ReturnType<typeof e2eConfig>;

export function e2eConfig() {
  loadE2EEnv();

  const platformSecret = env("E2E_PLATFORM_SECRET");
  const deposit = Number(env("E2E_DEPOSIT_USDC", "2"));
  if (!Number.isFinite(deposit) || deposit <= 0) {
    throw new Error("[e2e] E2E_DEPOSIT_USDC must be a positive number.");
  }

  return {
    apiUrl: env("API_URL", "http://localhost:3002").replace(/\/+$/, ""),
    hasuraUrl: env("HASURA_GRAPHQL_URL"),
    hasuraAdminSecret: env("HASURA_ADMIN_SECRET"),
    trustlessWorkUrl: env("TRUSTLESS_WORK_API_URL", "https://dev.api.trustlesswork.com").replace(/\/+$/, ""),
    trustlessWorkApiKey: env("TRUSTLESS_WORK_API_KEY"),
    /** Requests per 60 s this suite may cause on the shared Trustless Work key (limit is 50). */
    trustlessWorkBudget: Number(env("E2E_TW_RATE_BUDGET", "40")),
    horizonUrl: env("STELLAR_HORIZON_URL", "https://horizon-testnet.stellar.org").replace(/\/+$/, ""),
    networkPassphrase: env("STELLAR_NETWORK_PASSPHRASE", "Test SDF Network ; September 2015"),
    usdcIssuer: env("USDC_TRUSTLINE_ADDRESS"),
    platformAddress: env("PLATFORM_STELLAR_ADDRESS"),
    reconciliationSecret: optionalEnv("RECONCILIATION_SECRET") ?? optionalEnv("E2E_RECONCILIATION_SECRET"),
    /** Deposit each spec run puts in escrow, in USDC. Keep it small: faucet USDC is limited. */
    depositUsdc: deposit,
    /**
     * Fraction of a payout the Trustless Work protocol fee may take
     * (release and dispute resolution). The platform fee is 0.
     */
    payoutFeeTolerance: Number(env("E2E_PAYOUT_FEE_TOLERANCE", "0.01")),
    firebase: {
      apiKey: optionalEnv("NEXT_PUBLIC_FIREBASE_API_KEY") ?? optionalEnv("FIREBASE_WEB_API_KEY"),
      emulatorHost: optionalEnv("FIREBASE_AUTH_EMULATOR_HOST"),
      password: env("E2E_TEST_PASSWORD", "Password123!"),
    },
    users: {
      guest: {
        email: env("E2E_GUEST_EMAIL", "guest@safetrust.local"),
        secret: env("E2E_GUEST_SECRET"),
      },
      host: {
        email: env("E2E_HOST_EMAIL", "host@safetrust.local"),
        secret: env("E2E_HOST_SECRET"),
      },
      admin: {
        email: env("E2E_ADMIN_EMAIL", "admin@safetrust.local"),
        secret: platformSecret,
      },
    },
    platformPublicKey: Keypair.fromSecret(platformSecret).publicKey(),
  };
}
