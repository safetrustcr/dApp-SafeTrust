import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = dirname(fileURLToPath(import.meta.url));

function loadMcpEnv(): void {
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

loadMcpEnv();

/** Hasura GraphQL endpoint — same variable apps/api reads. */
export const HASURA_GRAPHQL_URL =
  process.env.HASURA_GRAPHQL_URL ?? 'http://localhost:8080/v1/graphql';

/**
 * Hasura admin secret. apps/api reads HASURA_ADMIN_SECRET while the root
 * .env.example names it HASURA_GRAPHQL_ADMIN_SECRET, so accept either before
 * falling back to the bin/start local default.
 */
export const HASURA_ADMIN_SECRET =
  process.env.HASURA_ADMIN_SECRET ??
  process.env.HASURA_GRAPHQL_ADMIN_SECRET ??
  'myadminsecretkey';

/** Protected API mutations are disabled unless explicitly enabled locally. */
export const MCP_MUTATIONS_ENABLED = process.env.SAFETRUST_MCP_ALLOW_MUTATIONS === 'true';

export type FirebaseTestUserCredentials = {
  apiKey: string;
  email: string;
  password: string;
};

/** Resolve local-only Firebase credentials only when a protected call needs them. */
export function getFirebaseTestUserCredentials(): FirebaseTestUserCredentials {
  const apiKey = process.env.SAFETRUST_MCP_FIREBASE_API_KEY;
  const email = process.env.SAFETRUST_MCP_TEST_EMAIL;
  const password = process.env.SAFETRUST_MCP_TEST_PASSWORD;

  if (!apiKey || !email || !password) {
    throw new Error(
      'Firebase test-user credentials are not configured. Set SAFETRUST_MCP_FIREBASE_API_KEY, ' +
        'SAFETRUST_MCP_TEST_EMAIL and SAFETRUST_MCP_TEST_PASSWORD in mcp/.env.',
    );
  }

  return { apiKey, email, password };
}

/** Base URL of apps/api (Express, port 3002 by default). */
export const SAFETRUST_API_URL = process.env.SAFETRUST_API_URL ?? 'http://localhost:3002';

/**
 * Opt-in escape hatch for the arbitrary-GraphQL tool. It is off unless
 * SAFETRUST_MCP_ENABLE_RAW_HASURA=true so a default install can never re-open
 * unrestricted reads against the database.
 */
export const ALLOW_RAW_HASURA_QUERY =
  process.env.SAFETRUST_MCP_ENABLE_RAW_HASURA === 'true';

/** SafeTrust platform wallet — collects the fee and resolves disputes. */
export const PLATFORM_ADDRESS =
  process.env.PLATFORM_STELLAR_ADDRESS ?? process.env.NEXT_PUBLIC_PLATFORM_ADDRESS ?? null;

/** USDC issuer on Stellar testnet (see root .env.example). */
export const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  'GBBD47IF6LWK7P7MDEVSCWR2JQTMZ35MIFUQ5IQSQ9CQBZ8JMXKDPE';

/** Outbound request timeout for Hasura and apps/api calls. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Stellar ed25519 public key. */
export const STELLAR_ADDRESS_REGEX = /^G[A-Z2-7]{55}$/;

/**
 * Absolute path to the monorepo root. Walks up from this module — src/ under tsx,
 * dist/ after a build — until the workspace manifest shows up, so the server works
 * no matter which cwd the editor launches it from. SAFETRUST_REPO_ROOT overrides.
 */
export function repoRoot(): string {
  const override = process.env.SAFETRUST_REPO_ROOT;
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
