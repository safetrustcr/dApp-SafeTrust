import { describe, it, expect, beforeAll } from 'vitest';
import { INTEGRATION_ENABLED, createTestClient } from './setup.js';
import { randomUUID } from 'node:crypto';

/** Seed with tests/fixtures/diagnose-cases.sql, then set MCP_DIAGNOSE_FIXTURES=1. */
const FIXTURES = process.env.MCP_DIAGNOSE_FIXTURES === '1';

const text = (result: { content: unknown }) => (result.content as Array<{ text: string }>)[0].text;

describe.skipIf(!INTEGRATION_ENABLED)('MCP escrow tools against a local stack', () => {
  let client: Awaited<ReturnType<typeof createTestClient>>['client'];

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('get-booking-context reports an unknown apartment and reservation', async () => {
    const apartment = await client.callTool({ name: 'get-booking-context', arguments: { apartmentId: randomUUID() } });
    expect(text(apartment)).toMatch(/Apartment .* not found/);
    const reservation = await client.callTool({ name: 'get-booking-context', arguments: { reservationId: randomUUID() } });
    expect(text(reservation)).toMatch(/Hotel reservation .* not found/);
  });

  it('diagnose-escrow explains an engagement with no escrow', async () => {
    const result = await client.callTool({ name: 'diagnose-escrow', arguments: { engagementId: `rental:${randomUUID()}:nobody` } });
    expect(text(result)).toContain('state: no-escrow');
  });

  it.skipIf(!FIXTURES)('diagnose-escrow explains the three seeded cases', async () => {
    const cases: Array<[string, RegExp]> = [
      ['rental:mcp-fixture:built', /^Built, not signed/],
      ['rental:mcp-fixture:submitted', /^Submitted, not confirmed yet/],
      ['rental:mcp-fixture:synced', /^Confirmed and synced/],
    ];
    for (const [engagementId, expected] of cases) {
      const result = await client.callTool({ name: 'diagnose-escrow', arguments: { engagementId } });
      expect(text(result)).toMatch(expected);
    }
  });
});
