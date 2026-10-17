import { describe, it, expect, beforeAll } from 'vitest';
import { INTEGRATION_ENABLED, createTestClient } from './setup.js';
import { randomUUID } from 'node:crypto';

describe.skipIf(!INTEGRATION_ENABLED)('MCP escrow tools', () => {
  let client: Awaited<ReturnType<typeof createTestClient>>['client'];

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('deploy-escrow and get-escrow-status integration', async () => {
    const apartmentId = randomUUID();
    const senderAddress = 'GAOQJGUAB7NI7K7I62ORBXMN3J4HOUX3CB2IA7V6M6YVBN5UCDJUR6Z6';
    const receiverAddress = 'GCXX34A2ZXYO22G5Y3H2G6J72H5X6J3Z3B4N6H6Z6S6X6V6C6P6I6QAA';
    const engagementId = randomUUID();

    const result = await client.callTool({
      name: 'deploy-escrow',
      arguments: {
        apartmentId,
        senderAddress,
        receiverAddress,
        amount: 10,
        engagementId,
      },
    });

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('Escrow deploy initiated');

    const statusResult = await client.callTool({
      name: 'get-escrow-status',
      arguments: {
        engagementId,
      },
    });

    const statusText = (statusResult.content[0] as { text: string }).text;
    expect(statusText).toContain('Escrow found');
  });
});
