import { vi } from 'vitest';

/**
 * Module-scope config (config.ts) reads process.env once at import, so unit
 * tests set env before loading the module and reset it afterwards.
 */
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
