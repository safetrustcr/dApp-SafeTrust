import { defineConfig, devices } from "@playwright/test";
import { loadE2EEnv } from "./lib/env";

/**
 * E2E configuration for the SafeTrust testnet specs (golden path + dispute).
 *
 * The specs run against a live local stack (Hasura + api) connected to Stellar
 * testnet and the Trustless Work testnet API. They are excluded from the
 * unit-test pipeline (`pnpm test` / turbo test) and run from the nightly +
 * manual CI workflow, or locally with `pnpm --filter @safetrust/web test:e2e`.
 *
 * Setup, env and a by-hand walkthrough: docs/testnet-booking.md
 */
loadE2EEnv();

export default defineConfig({
  testDir: "./",
  testMatch: ["**/*.spec.ts"],

  /* Per-test default; the testnet specs raise it with test.setTimeout. */
  timeout: 180_000,

  /* Two full testnet bookings plus waits on the Trustless Work rate limit. */
  globalTimeout: 30 * 60 * 1_000,

  /* Global setup: verifies env and testnet provisioning before any test runs. */
  globalSetup: "./global-setup.ts",

  /* Never retry: a retry would book again on testnet and double the spend. */
  retries: 0,

  /*
   * One spec at a time. The specs share one Trustless Work API key
   * (50 requests / 60 s) and the same guest wallet balance.
   */
  workers: 1,
  fullyParallel: false,

  /* apps/frontend/test-results and apps/frontend/playwright-report (CI uploads both). */
  outputDir: "../test-results",
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never", outputFolder: "../playwright-report" }]]
    : [["list"], ["html", { open: "on-failure", outputFolder: "../playwright-report" }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001",
    trace: "retain-on-failure",
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
