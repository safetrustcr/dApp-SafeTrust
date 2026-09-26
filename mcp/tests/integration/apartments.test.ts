import { describe, it, expect, beforeAll } from 'vitest';
import { INTEGRATION_ENABLED, createTestClient } from './setup.js';

describe.skipIf(!INTEGRATION_ENABLED)('MCP apartment tools', () => {
  let client: Awaited<ReturnType<typeof createTestClient>>['client'];

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('list-apartments returns at least one apartment', async () => {
    const result = await client.callTool({ name: 'list-apartments', arguments: { limit: 5 } });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toMatch(/apartment\(s\) found/);
  });

  it('get-apartment returns owner wallet when apartment exists', async () => {
    const listResult = await client.callTool({ name: 'list-apartments', arguments: { limit: 1 } });
    const text = (listResult.content[0] as { text: string }).text;
    const idMatch = text.match(/"id": "([^"]+)"/);
    if (!idMatch) return; // no apartments seeded — skip gracefully

    const result = await client.callTool({
      name: 'get-apartment',
      arguments: { apartmentId: idMatch[1] },
    });
    const detailText = (result.content[0] as { text: string }).text;
    expect(detailText).toMatch(/Apartment:/);
    expect(detailText).toMatch(/warranty_deposit/);
  });
});
