import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

export const apiEnvFile = fileURLToPath(new URL('../../.env', import.meta.url));

/**
 * Resolve API config from the API package, regardless of the shell's directory.
 *
 * Variables already set on the process environment take precedence over values
 * in the .env file. The Stellar network passphrase is read from
 * STELLAR_NETWORK_PASSPHRASE on both the API and the frontend (as
 * NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE); use the full value
 * "Test SDF Network ; September 2015" for testnet.
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
}

loadApiEnvironment();
