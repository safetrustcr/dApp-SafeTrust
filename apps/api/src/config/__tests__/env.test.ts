import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiEnvFile, loadApiEnvironment } from '../env.js';
let directory: string | undefined;
afterEach(() => { if (directory) rmSync(directory, { recursive: true, force: true }); });
describe('API environment loading', () => {
  it('resolves the environment file from the API package', () => {
    expect(apiEnvFile.replaceAll('\\', '/')).toMatch(/apps\/api\/\.env$/);
  });
  it('loads configuration with the deployment secret alias and preserves exported variables', () => {
    directory = mkdtempSync(join(tmpdir(), 'safetrust-env-'));
    const file = join(directory, '.env');
    writeFileSync(file, 'HASURA_GRAPHQL_ADMIN_SECRET=test-database-key\nPORT=3002\n');
    const environment = { PORT: '3999' } as NodeJS.ProcessEnv;
    loadApiEnvironment(file, environment);
    expect(environment.HASURA_ADMIN_SECRET).toBe('test-database-key');
    expect(environment.PORT).toBe('3999');
  });
});
