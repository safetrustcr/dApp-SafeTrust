import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const CONFIG_HELP = ' See mcp/README.md#configuration.';
const DEFAULT_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', 'host.docker.internal']);

let mcpEnvLoaded = false;

/** Configuration failures are safe to show to an MCP client. */
export class McpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpConfigError';
  }
}

/**
 * Load the ignored local MCP env file only when configuration is first needed.
 * This lets the process expose documentation resources without any credentials.
 */
function loadMcpEnv(): void {
  if (mcpEnvLoaded) return;
  mcpEnvLoaded = true;

  const envPath = join(moduleDir, '..', '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;

    let value = match[2];
    const doubleQuoted = value.startsWith('"') && value.endsWith('"');
    if (doubleQuoted || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
      if (doubleQuoted) value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
    }
    process.env[match[1]] = value;
  }
}

function env(name: string): string | undefined {
  loadMcpEnv();
  const value = process.env[name]?.trim();
  return value || undefined;
}

function required(name: string): string {
  const value = env(name);
  if (!value) throw new McpConfigError(`${name} is not set.${CONFIG_HELP}`);
  return value;
}

function boolean(name: string, fallback = false): boolean {
  const value = env(name);
  if (value === undefined) return fallback;
  const parsed = z.enum(['true', 'false']).safeParse(value);
  if (!parsed.success) throw new McpConfigError(`${name} must be true or false.${CONFIG_HELP}`);
  return parsed.data === 'true';
}

function allowedHosts(): Set<string> {
  const extra = env('SAFETRUST_MCP_ALLOWED_HOSTS')
    ?.split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean) ?? [];

  for (const host of extra) {
    if (!/^[a-z0-9][a-z0-9.-]*$/i.test(host)) {
      throw new McpConfigError(`SAFETRUST_MCP_ALLOWED_HOSTS contains an invalid host.${CONFIG_HELP}`);
    }
  }

  return new Set([...DEFAULT_LOCAL_HOSTS, ...extra]);
}

function localServiceUrl(variable: 'HASURA_GRAPHQL_URL' | 'SAFETRUST_API_URL'): string {
  const value = required(variable);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new McpConfigError(`${variable} must be an absolute http(s) URL.${CONFIG_HELP}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new McpConfigError(`${variable} must use http or https.${CONFIG_HELP}`);
  }
  if (url.username || url.password) {
    throw new McpConfigError(`${variable} must not include URL credentials.${CONFIG_HELP}`);
  }
  if (!boolean('SAFETRUST_MCP_ALLOW_REMOTE') && !allowedHosts().has(url.hostname.toLowerCase())) {
    throw new McpConfigError('Remote hosts are disabled for the MCP.');
  }

  return url.toString().replace(/\/$/, '');
}

/** Returns the locally validated Hasura endpoint, without requiring a secret. */
export function getHasuraUrl(): string {
  return localServiceUrl('HASURA_GRAPHQL_URL');
}

/** Returns the locally validated apps/api endpoint. */
export function getSafetrustApiUrl(): string {
  return localServiceUrl('SAFETRUST_API_URL');
}

/** Hasura requests require both the local URL and explicit admin-secret config. */
export function getHasuraConfig(): { url: string; adminSecret: string } {
  return { url: getHasuraUrl(), adminSecret: required('HASURA_GRAPHQL_ADMIN_SECRET') };
}

/** Protected API mutations are disabled unless explicitly enabled locally. */
export function mutationsEnabled(): boolean {
  return boolean('SAFETRUST_MCP_ALLOW_MUTATIONS');
}

/** The arbitrary GraphQL escape hatch is off unless explicitly enabled locally. */
export function rawHasuraQueryEnabled(): boolean {
  return boolean('SAFETRUST_MCP_ENABLE_RAW_HASURA');
}

export function showFullIds(): boolean {
  return boolean('SAFETRUST_MCP_SHOW_FULL_IDS');
}

export function remoteHostsAllowed(): boolean {
  return boolean('SAFETRUST_MCP_ALLOW_REMOTE');
}

export type FirebaseTestUserCredentials = { apiKey: string; email: string; password: string };

/** Resolve local-only Firebase credentials only when a protected call needs them. */
export function getFirebaseTestUserCredentials(): FirebaseTestUserCredentials {
  return {
    apiKey: required('SAFETRUST_MCP_FIREBASE_API_KEY'),
    email: required('SAFETRUST_MCP_TEST_EMAIL'),
    password: required('SAFETRUST_MCP_TEST_PASSWORD'),
  };
}

/** SafeTrust platform wallet — public configuration, not a secret. */
export function platformAddress(): string | null {
  return env('PLATFORM_STELLAR_ADDRESS') ?? env('NEXT_PUBLIC_PLATFORM_ADDRESS') ?? null;
}

/** USDC issuer on Stellar testnet; this public reference has a documented default. */
export function usdcAddress(): string {
  return env('NEXT_PUBLIC_USDC_ADDRESS') ?? 'GBBD47IF6LWK7P7MDEVSCWR2JQTMZ35MIFUQ5IQSQ9CQBZ8JMXKDPE';
}

/** Safe startup diagnostics: URLs/status only, never secrets. */
export function configurationSummary(): string {
  const hasura = env('HASURA_GRAPHQL_URL');
  const api = env('SAFETRUST_API_URL');
  const mutations = env('SAFETRUST_MCP_ALLOW_MUTATIONS') === 'true' ? 'enabled' : 'disabled';
  const remote = env('SAFETRUST_MCP_ALLOW_REMOTE') === 'true';
  const describe = (value: string | undefined) => (value ? `configured (${safeUrlForLog(value)})` : 'missing');
  return `hasura: ${describe(hasura)} · api: ${describe(api)} · mutations: ${mutations}${remote ? ' · WARNING remote hosts enabled' : ''}`;
}

function safeUrlForLog(value: string): string {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return 'invalid URL';
  }
}

/** Outbound request timeout for Hasura and apps/api calls. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Stellar ed25519 public key. */
export const STELLAR_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

/** Resolve the monorepo root without requiring any service configuration. */
export function repoRoot(): string {
  const override = env('SAFETRUST_REPO_ROOT');
  if (override) return resolve(override);

  let current = moduleDir;
  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return resolve(moduleDir, '../..');
}
