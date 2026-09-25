import { describe, it, expect, beforeAll } from 'vitest';
import { INTEGRATION_ENABLED, createTestClient } from './setup.js';

describe.skipIf(!INTEGRATION_ENABLED)('MCP Hasura tools', () => {
  let client: Awaited<ReturnType<typeof createTestClient>>['client'];

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('query-escrows returns escrows list', async () => {
    const result = await client.callTool({ name: 'query-escrows', arguments: { limit: 1 } });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toMatch(/escrow row\(s\)/);
  });

  it('query-user-wallets returns wallets list', async () => {
    const result = await client.callTool({
      name: 'query-user-wallets',
      arguments: { limit: 1, email: 'test@example.com' },
    });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toMatch(/wallet\(s\)/);
  });
});
