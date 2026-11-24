import { vi } from 'vitest';

/**
 * config.ts reads process.env lazily, but tool registration (hasura-query) and
 * the mcp/.env loader are still per-module, so unit tests set env before loading
 * the module and reset it afterwards.
 */
/** Test doubles live on `*.test` hosts, which the MCP would otherwise refuse as remote. */
export const TEST_HOSTS = {
  SAFETRUST_MCP_ALLOWED_HOSTS: 'hasura.test,api.test',
  SAFETRUST_MCP_ALLOW_REMOTE: undefined,
  SAFETRUST_MCP_SHOW_FULL_IDS: undefined,
} as const;
const tracked = new Map<string, string | undefined>();

export function setEnv(values: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(values)) {
    if (!tracked.has(key)) tracked.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

export function restoreEnv(): void {
  for (const [key, original] of tracked) {
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  }
  tracked.clear();
}

/** Drops the module cache and applies `env` before importing. */
export async function loadFresh<T>(
  env: Record<string, string | undefined>,
  loader: () => Promise<unknown>,
): Promise<T> {
  vi.resetModules();
  setEnv(env);
  return (await loader()) as T;
}
