import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bootTestClient } from '../helpers/boot.js';
import { textOf, type TestClient } from '../helpers/mcp.js';

/**
 * Opt-in smoke suite: runs the read-only tools against the local stack (apps/api
 * + Hasura) exactly the way an editor session does.
 *
 *   MCP_TESTNET_SMOKE=true pnpm --filter @safetrust/mcp test:smoke
 *
 * It must never build, sign or submit a transaction, so it only uses tools with
 * readOnlyHint and asserts that no XDR comes back.
 */
const ENABLED = process.env.MCP_TESTNET_SMOKE === 'true';

describe.skipIf(!ENABLED)('Testnet smoke (read-only, no transactions)', () => {
  let open: TestClient;
  const outputs: string[] = [];

  beforeAll(async () => {
    open = await bootTestClient();
  });

  afterAll(async () => {
    await open?.close();
  });

  async function call(name: string, args: Record<string, unknown> = {}) {
    const result = await open.client.callTool({ name, arguments: args });
    const text = textOf(result);
    outputs.push(text);
    return { result, text };
  }

  it('reports apps/api and Hasura as healthy', async () => {
    const { text } = await call('check-stack-health');

    expect(text).toContain('✅ apps/api');
    expect(text).toContain('✅ Hasura');
    expect(text).toContain('Stack is ready for escrow operations.');
  });

  it('answers list-apartments from the seeded database', async () => {
    const { result, text } = await call('list-apartments', { limit: 5 });

    expect(result.isError).toBeFalsy();
    expect(text).toMatch(/apartment\(s\) found\.|No apartments matched those filters\./);
  });

  it('resolves get-escrow-status without writing anything', async () => {
    const { result, text } = await call('get-escrow-status', {
      engagementId: `smoke:${Date.now()}`,
    });

    expect(result.isError).toBeFalsy();
    expect(text).toContain('No escrow found for that identifier in public.escrows.');
  });

  it('does not expose the raw GraphQL escape hatch by default', async () => {
    const { tools } = await open.client.listTools();

    expect(tools.map((tool) => tool.name)).not.toContain('hasura-query');
  });

  it('built no transactions', () => {
    const joined = outputs.join('\n');

    expect(joined).not.toMatch(/unsignedXDR:|unsignedTransaction:|AAAAAg/);
  });
});
