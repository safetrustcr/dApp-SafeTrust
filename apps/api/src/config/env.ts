import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

export const apiEnvFile = fileURLToPath(new URL('../../.env', import.meta.url));

/**
 * Resolve API config from the API package, regardless of the shell's directory.
 *
 * Also normalizes the Stellar network passphrase: the API reads `STELLAR_NETWORK_PASSPHRASE`
 * (full passphrase, e.g. `Test SDF Network ; September 2015` for testnet). The frontend uses the
 * same variable name via `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE`, so if only the legacy
 * `NEXT_PUBLIC_STELLAR_NETWORK` is set we fall back to it for the API as well.
 */
export function loadApiEnvironment(path = process.env.DOTENV_CONFIG_PATH ?? apiEnvFile, environment: NodeJS.ProcessEnv = process.env) {
  const fileEnvironment: Record<string, string> = {};
  config({ path, processEnv: fileEnvironment });
  for (const [name, value] of Object.entries(fileEnvironment)) {
    if (environment[name] === undefined) environment[name] = value;
  }
  if (!environment.HASURA_ADMIN_SECRET && environment.HASURA_GRAPHQL_ADMIN_SECRET) {
    environment.HASURA_ADMIN_SECRET = environment.HASURA_GRAPHQL_ADMIN_SECRET;
  }
  if (!environment.STELLAR_NETWORK_PASSPHRASE) {
    const legacy = environment.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE ?? environment.NEXT_PUBLIC_STELLAR_NETWORK;
    if (legacy) environment.STELLAR_NETWORK_PASSPHRASE = legacy;
  }
}

loadApiEnvironment();
