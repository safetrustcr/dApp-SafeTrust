import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

export const apiEnvFile = fileURLToPath(new URL('../../.env', import.meta.url));

/** Resolve API config from the API package, regardless of the shell's directory. */
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
