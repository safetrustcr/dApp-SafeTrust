import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { bootTestClient } from '../helpers/boot.js';
import { restoreEnv } from '../helpers/env.js';
import type { TestClient } from '../helpers/mcp.js';

let open: TestClient | undefined;
let scratch: string | undefined;

afterEach(async () => {
  await open?.close();
  open = undefined;
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  scratch = undefined;
  restoreEnv();
});

describe('registered tools', () => {
  it('exposes the documented tool surface and nothing else', async () => {
    open = await bootTestClient();

    const { tools } = await open.client.listTools();

    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'check-stack-health',
      'deploy-escrow',
      'explain-escrow-roles',
      'fund-escrow',
      'get-apartment',
      'get-escrow-status',
      'list-apartments',
      'orchestrate-escrow',
      'query-escrows',
      'query-trustless-work-escrows',
      'query-user-wallets',
    ]);
  });

  it('marks the read-only tools so a client can reason about side effects', async () => {
    open = await bootTestClient();

    const { tools } = await open.client.listTools();
    const listing = tools.find((tool) => tool.name === 'list-apartments');
    const deploy = tools.find((tool) => tool.name === 'deploy-escrow');

    expect(listing?.annotations?.readOnlyHint).toBe(true);
    expect(deploy?.annotations?.readOnlyHint).toBe(false);
  });
});

describe('documentation resources', () => {
  it('lists the architecture resource and the file-backed docs', async () => {
    open = await bootTestClient();

    const { resources } = await open.client.listResources();
    const uris = resources.map((resource) => resource.uri);

    expect(uris).toContain('safetrust://docs/architecture');
    expect(uris).toContain('safetrust://docs/safetrust-readme');
    expect(uris).toContain('safetrust://docs/safetrust-mcp-readme');
  });

  it('renders the architecture context from the code, not a stale copy', async () => {
    open = await bootTestClient();

    const result = await open.client.readResource({ uri: 'safetrust://docs/architecture' });
    const text = String(result.contents[0].text);

    expect(text).toContain('# SafeTrust architecture context');
    expect(text).toContain('## Escrow lifecycle');
    expect(text).toContain('`public.escrows`');
    expect(text).toContain('http://hasura.test/v1/graphql');
    expect(text).toContain('TrustlessWork');
  });

  it('reads file-backed resources on demand and skips files that moved', async () => {
    scratch = mkdtempSync(join(tmpdir(), 'safetrust-mcp-docs-'));
    writeFileSync(join(scratch, 'README.md'), '# scratch readme\n');

    open = await bootTestClient({ SAFETRUST_REPO_ROOT: scratch });

    const { resources } = await open.client.listResources();
    const uris = resources.map((resource) => resource.uri);
    expect(uris).toEqual(
      expect.arrayContaining(['safetrust://docs/safetrust-readme', 'safetrust://docs/architecture']),
    );
    expect(uris).not.toContain('safetrust://docs/safetrust-mcp-readme');

    const readme = await open.client.readResource({ uri: 'safetrust://docs/safetrust-readme' });
    expect(String(readme.contents[0].text)).toContain('# scratch readme');
  });
});
