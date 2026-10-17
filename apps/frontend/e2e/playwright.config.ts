import { defineConfig, devices } from "@playwright/test";

/**
 * E2E configuration for the SafeTrust golden-path test.
 *
 * This test suite runs against a live local stack (api + web) connected to
 * Stellar testnet. It is intentionally excluded from the unit-test pipeline
 * (`pnpm test` / turbo test) and only triggered by the nightly + manual CI
 * workflow, or locally with `pnpm test:e2e`.
 *
 * Pre-requisites before running:
 *   make infra                           # Hasura + Postgres
 *   pnpm testnet:provision --check       # accounts, trustlines, apartment ready
 *   pnpm run dev                         # api + web
 */
export default defineConfig({
  testDir: "./",
  testMatch: ["**/*.spec.ts"],

  /* Time each individual test step is allowed before it times out. */
  timeout: 180_000,

  /* Give the full suite 20 minutes — testnet confirmations can be slow. */
  globalTimeout: 20 * 60 * 1_000,

  /* Global setup: verifies testnet provisioning before any test runs. */
  globalSetup: "./global-setup.ts",

  /* One retry on CI to guard against transient testnet flakiness. */
  retries: process.env.CI ? 1 : 0,

  /* Run tests sequentially — the scenario has order-dependent state. */
  workers: 1,

  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "on-failure" }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001",
    /* Capture trace on first retry so we always have a trace on failure. */
    trace: "on-first-retry",
    /* Record video on retry too — invaluable for async testnet debugging. */
    video: "on-first-retry",
    /* Generous navigation timeout for heavy Next.js pages on first load. */
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
