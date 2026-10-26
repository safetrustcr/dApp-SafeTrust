import { vi } from 'vitest';

import { setEnv } from './env.js';
import type { TestClient } from './mcp.js';

export type BootOptions = Record<string, string | undefined>;

/**
 * Loads a fresh copy of the server with the given environment.
 *
 * config.ts reads process.env at module scope, so the registry has to be reset
 * before the tools are imported — otherwise a flag read by an earlier test
 * leaks into the next one.
 */
export async function bootTestClient(env: BootOptions = {}): Promise<TestClient> {
  vi.resetModules();
  setEnv({
    HASURA_GRAPHQL_URL: 'http://hasura.test/v1/graphql',
    HASURA_ADMIN_SECRET: 'test-admin-secret',
    HASURA_GRAPHQL_ADMIN_SECRET: undefined,
    SAFETRUST_API_URL: 'http://api.test',
    SAFETRUST_MCP_ENABLE_RAW_HASURA: undefined,
    PLATFORM_STELLAR_ADDRESS: undefined,
    NEXT_PUBLIC_PLATFORM_ADDRESS: undefined,
    ...env,
  });

  const { createTestClient } = await import('./mcp.js');
  return createTestClient();
}
