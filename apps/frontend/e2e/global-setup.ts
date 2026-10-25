/**
 * Playwright global setup — runs once before any test file.
 *
 * Fails fast with a clear human-readable message if the testnet provisioning
 * script reports that accounts, trustlines, or the seeded apartment are not
 * ready. This avoids confusing mid-test failures caused by missing on-chain
 * state.
 */

import { execSync } from "child_process";

export default async function globalSetup(): Promise<void> {
  console.log("[global-setup] Verifying testnet provisioning…");

  // Require every provisioning secret to be set before we even attempt to run.
  const required = [
    "E2E_GUEST_SECRET",
    "E2E_HOST_SECRET",
    "E2E_PLATFORM_SECRET",
    "TRUSTLESS_WORK_API_KEY",
  ] as const;

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[global-setup] Missing required environment variables: ${missing.join(", ")}.\n` +
        `Copy apps/frontend/.env.e2e.example and fill in the secrets before running E2E tests.`,
    );
  }

  // pnpm testnet:provision --check exits 0 when all accounts/trustlines/apartment
  // are ready and non-zero when something is missing or stale.
  try {
    execSync("pnpm testnet:provision --check", {
      cwd: process.cwd(),
      stdio: "inherit",
      timeout: 60_000,
    });
  } catch {
    throw new Error(
      "[global-setup] testnet:provision --check failed.\n" +
        "Run `pnpm testnet:provision` to set up accounts, trustlines, users, " +
        "and the seeded apartment, then retry.",
    );
  }

  console.log("[global-setup] Testnet ready. Starting tests…");
}
