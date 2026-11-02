import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { loadFresh, restoreEnv } from '../helpers/env.js';

type ConfigModule = typeof import('../../src/config.js');

const NO_CONFIG = {
  HASURA_GRAPHQL_URL: undefined,
  HASURA_ADMIN_SECRET: undefined,
  HASURA_GRAPHQL_ADMIN_SECRET: undefined,
  SAFETRUST_API_URL: undefined,
  SAFETRUST_MCP_ALLOW_REMOTE: undefined,
  SAFETRUST_MCP_ALLOWED_HOSTS: undefined,
  SAFETRUST_MCP_ALLOW_MUTATIONS: undefined,
  SAFETRUST_MCP_ENABLE_RAW_HASURA: undefined,
};

function loadConfig(env: Record<string, string | undefined> = {}): Promise<ConfigModule> {
  return loadFresh<ConfigModule>({ ...NO_CONFIG, ...env }, () => import('../../src/config.js'));
}

afterEach(restoreEnv);

describe('config: no defaults for service endpoints or secrets', () => {
  it('imports without any env var and fails only when a value is read', async () => {
    const config = await loadConfig();

    expect(() => config.getHasuraUrl()).toThrow('HASURA_GRAPHQL_URL is not set.');
    expect(() => config.getSafetrustApiUrl()).toThrow('SAFETRUST_API_URL is not set.');
  });

  it('names the missing admin secret and never invents one', async () => {
    const { getHasuraConfig, McpConfigError } = await loadConfig({
      HASURA_GRAPHQL_URL: 'http://localhost:8080/v1/graphql',
    });

    expect(() => getHasuraConfig()).toThrow(McpConfigError);
    expect(() => getHasuraConfig()).toThrow(/HASURA_ADMIN_SECRET is not set.*See mcp\/README\.md#configuration/);
  });

  it('accepts either spelling of the Hasura admin secret', async () => {
    const local = { HASURA_GRAPHQL_URL: 'http://localhost:8080/v1/graphql' };

    const canonical = await loadConfig({ ...local, HASURA_ADMIN_SECRET: 'from-canonical' });
    expect(canonical.getHasuraConfig().adminSecret).toBe('from-canonical');

    const alias = await loadConfig({ ...local, HASURA_GRAPHQL_ADMIN_SECRET: 'from-alias' });
    expect(alias.getHasuraConfig().adminSecret).toBe('from-alias');
  });

  it('never echoes a rejected value in the error', async () => {
    const { getSafetrustApiUrl } = await loadConfig({ SAFETRUST_API_URL: 'not a url s3cr3t' });

    expect(() => getSafetrustApiUrl()).toThrow('SAFETRUST_API_URL must be an absolute http(s) URL.');
    expect(() => getSafetrustApiUrl()).not.toThrow(/s3cr3t/);
  });

  it('refuses URLs that embed credentials', async () => {
    const { getHasuraUrl } = await loadConfig({ HASURA_GRAPHQL_URL: 'http://admin:pw@localhost:8080/v1/graphql' });

    expect(() => getHasuraUrl()).toThrow('HASURA_GRAPHQL_URL must not include URL credentials.');
  });
});

describe('config: local hosts only', () => {
  it.each(['localhost', '127.0.0.1', 'host.docker.internal'])('accepts %s', async (host) => {
    const { getHasuraUrl } = await loadConfig({ HASURA_GRAPHQL_URL: `http://${host}:8080/v1/graphql` });

    expect(getHasuraUrl()).toBe(`http://${host}:8080/v1/graphql`);
  });

  it('refuses a remote Hasura unless SAFETRUST_MCP_ALLOW_REMOTE=true', async () => {
    const url = 'https://hasura.example.com/v1/graphql';

    const refused = await loadConfig({ HASURA_GRAPHQL_URL: url });
    expect(() => refused.getHasuraUrl()).toThrow('Remote hosts are disabled for the MCP.');

    const allowed = await loadConfig({ HASURA_GRAPHQL_URL: url, SAFETRUST_MCP_ALLOW_REMOTE: 'true' });
    expect(allowed.getHasuraUrl()).toBe(url);
  });

  it('refuses a remote apps/api the same way', async () => {
    const { getSafetrustApiUrl } = await loadConfig({ SAFETRUST_API_URL: 'https://api.example.com' });

    expect(() => getSafetrustApiUrl()).toThrow('Remote hosts are disabled for the MCP.');
  });

  it('treats Docker service names in SAFETRUST_MCP_ALLOWED_HOSTS as local', async () => {
    const { getHasuraUrl } = await loadConfig({
      HASURA_GRAPHQL_URL: 'http://graphql-engine:8080/v1/graphql',
      SAFETRUST_MCP_ALLOWED_HOSTS: 'graphql-engine, postgres',
    });

    expect(getHasuraUrl()).toBe('http://graphql-engine:8080/v1/graphql');
  });

  it('rejects a boolean flag that is not exactly true or false', async () => {
    const { remoteHostsAllowed } = await loadConfig({ SAFETRUST_MCP_ALLOW_REMOTE: '1' });

    expect(() => remoteHostsAllowed()).toThrow('SAFETRUST_MCP_ALLOW_REMOTE must be true or false.');
  });

  it('leaves the arbitrary-GraphQL escape hatch and mutations off by default', async () => {
    const off = await loadConfig();
    expect(off.rawHasuraQueryEnabled()).toBe(false);
    expect(off.mutationsEnabled()).toBe(false);

    const on = await loadConfig({ SAFETRUST_MCP_ENABLE_RAW_HASURA: 'true' });
    expect(on.rawHasuraQueryEnabled()).toBe(true);
  });
});

describe('configurationSummary', () => {
  it('reports what is missing without failing', async () => {
    const { configurationSummary } = await loadConfig();

    expect(configurationSummary()).toBe('hasura: missing · api: missing · mutations: disabled');
  });

  it('shows URLs, never the admin secret', async () => {
    const { configurationSummary } = await loadConfig({
      HASURA_GRAPHQL_URL: 'http://localhost:8080/v1/graphql',
      HASURA_ADMIN_SECRET: 'super-secret-value',
      SAFETRUST_API_URL: 'http://localhost:3002',
    });

    const summary = configurationSummary();
    expect(summary).toBe(
      'hasura: configured (http://localhost:8080/v1/graphql) · api: configured (http://localhost:3002) · mutations: disabled',
    );
    expect(summary).not.toContain('super-secret-value');
  });

  it('flags a refused host and warns when remote hosts are enabled', async () => {
    const refused = await loadConfig({ HASURA_GRAPHQL_URL: 'https://hasura.example.com/v1/graphql' });
    expect(refused.configurationSummary()).toContain(
      'hasura: refused (https://hasura.example.com/v1/graphql: Remote hosts are disabled for the MCP.)',
    );

    const remote = await loadConfig({
      HASURA_GRAPHQL_URL: 'https://hasura.example.com/v1/graphql',
      SAFETRUST_MCP_ALLOW_REMOTE: 'true',
    });
    expect(remote.configurationSummary()).toContain('WARNING remote hosts enabled');
  });
});

describe('STELLAR_ADDRESS_REGEX', () => {
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
