import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Hasura GraphQL endpoint — same variable apps/api reads. */
export const HASURA_GRAPHQL_URL =
  process.env.HASURA_GRAPHQL_URL ?? 'http://localhost:8080/v1/graphql';

/**
 * Hasura admin secret. apps/api reads HASURA_ADMIN_SECRET while the root
 * .env.example names it HASURA_GRAPHQL_ADMIN_SECRET, so accept either before
 * falling back to the dc_prep local default.
 */
export const HASURA_ADMIN_SECRET =
  process.env.HASURA_ADMIN_SECRET ??
  process.env.HASURA_GRAPHQL_ADMIN_SECRET ??
  'myadminsecretkey';

/** Base URL of apps/api (Express, port 3002 by default). */
export const SAFETRUST_API_URL = process.env.SAFETRUST_API_URL ?? 'http://localhost:3002';

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

const moduleDir = dirname(fileURLToPath(import.meta.url));

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
