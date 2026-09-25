import { describe, it, expect, beforeAll } from 'vitest';
import { INTEGRATION_ENABLED, createTestClient } from './setup.js';

// Docs resources read local files — they work without Hasura
describe('MCP documentation resources', () => {
  let client: Awaited<ReturnType<typeof createTestClient>>['client'];

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('safetrust-architecture resource returns architecture context', async () => {
    const result = await client.readResource({
      uri: 'safetrust://docs/architecture',
    });
    const text = result.contents[0].text as string;
    expect(text).toMatch(/SafeTrust architecture context/);
    expect(text).toMatch(/Escrow lifecycle/);
    expect(text).toMatch(/TrustlessWork/);
  });
});
