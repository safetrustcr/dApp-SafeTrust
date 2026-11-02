import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { loadFresh, restoreEnv } from '../helpers/env.js';

type ConfigModule = typeof import('../../src/config.js');

function loadConfig(env: Record<string, string | undefined> = {}): Promise<ConfigModule> {
  return loadFresh<ConfigModule>(env, () => import('../../src/config.js'));
}

afterEach(restoreEnv);

describe('config defaults', () => {
  it('points at the local developer stack by default', async () => {
    const config = await loadConfig({
      HASURA_GRAPHQL_URL: undefined,
      SAFETRUST_API_URL: undefined,
      SAFETRUST_MCP_ENABLE_RAW_HASURA: undefined,
    });

    expect(config.HASURA_GRAPHQL_URL).toBe('http://localhost:8080/v1/graphql');
    expect(config.SAFETRUST_API_URL).toBe('http://localhost:3002');
  });

  it('leaves the arbitrary-GraphQL escape hatch off unless it is explicitly enabled', async () => {
    const off = await loadConfig({ SAFETRUST_MCP_ENABLE_RAW_HASURA: undefined });
    expect(off.ALLOW_RAW_HASURA_QUERY).toBe(false);

    const almost = await loadConfig({ SAFETRUST_MCP_ENABLE_RAW_HASURA: '1' });
    expect(almost.ALLOW_RAW_HASURA_QUERY).toBe(false);

    const on = await loadConfig({ SAFETRUST_MCP_ENABLE_RAW_HASURA: 'true' });
    expect(on.ALLOW_RAW_HASURA_QUERY).toBe(true);
  });

  it('accepts either spelling of the Hasura admin secret', async () => {
    const canonical = await loadConfig({ HASURA_ADMIN_SECRET: 'from-canonical' });
    expect(canonical.HASURA_ADMIN_SECRET).toBe('from-canonical');

    const alias = await loadConfig({
      HASURA_ADMIN_SECRET: undefined,
      HASURA_GRAPHQL_ADMIN_SECRET: 'from-alias',
    });
    expect(alias.HASURA_ADMIN_SECRET).toBe('from-alias');
  });

  it('validates Stellar public keys and nothing else', async () => {
    const { STELLAR_ADDRESS_REGEX } = await loadConfig();

    expect(STELLAR_ADDRESS_REGEX.test('GAOQJGUAB7NI7K7I62ORBXMN3J4HOUX3CB2IA7V6M6YVBN5UCDJUR6Z6')).toBe(
      true,
    );
    expect(STELLAR_ADDRESS_REGEX.test('gaoqjguab7ni7k7i62orbxmn3j4houx3cb2ia7v6m6yvbn5ucdjur6z6')).toBe(
      false,
    );
    expect(STELLAR_ADDRESS_REGEX.test('GAOQJGUAB7NI7K7I62ORBXMN3J4HOUX3CB2IA7V6M6YVBN5UCDJUR6Z')).toBe(
      false,
    );
  });
});

describe('repoRoot', () => {
  it('honours SAFETRUST_REPO_ROOT', async () => {
    const { repoRoot } = await loadConfig({ SAFETRUST_REPO_ROOT: '../somewhere-else' });

    expect(repoRoot()).toBe(resolve('../somewhere-else'));
  });

  it('walks up from the module to the pnpm workspace root', async () => {
    const { repoRoot } = await loadConfig({ SAFETRUST_REPO_ROOT: undefined });

    const root = repoRoot();
    expect(existsSync(join(root, 'pnpm-workspace.yaml'))).toBe(true);
    expect(existsSync(join(root, 'mcp', 'package.json'))).toBe(true);
  });
});
