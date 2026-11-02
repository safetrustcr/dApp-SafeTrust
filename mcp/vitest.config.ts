import { defineConfig } from 'vitest/config';

/**
 * Three suites, selected by the path passed on the CLI:
 *
 *   vitest run tests/unit      — fully mocked, no network (runs on every PR)
 *   vitest run tests/contract  — apps/api routes mounted in-process
 *   vitest run tests/smoke     — skipped unless MCP_TESTNET_SMOKE=true
 *
 * The default `include` stays broad so a mistyped path fails loudly instead of
 * matching zero tests and reporting success.
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
