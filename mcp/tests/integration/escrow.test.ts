import { describe, it, expect, beforeAll } from 'vitest';
import { INTEGRATION_ENABLED, createTestClient } from './setup.js';
import { randomUUID } from 'node:crypto';

const MUTATION_INTEGRATION_ENABLED =
  INTEGRATION_ENABLED &&
  process.env.SAFETRUST_MCP_ALLOW_MUTATIONS === 'true' &&
  Boolean(process.env.SAFETRUST_MCP_FIREBASE_API_KEY) &&
  Boolean(process.env.SAFETRUST_MCP_TEST_EMAIL) &&
  Boolean(process.env.SAFETRUST_MCP_TEST_PASSWORD) &&
  Boolean(process.env.SAFETRUST_MCP_TEST_APARTMENT_ID) &&
  Boolean(process.env.SAFETRUST_MCP_TEST_WALLET_ADDRESS);

describe.skipIf(!MUTATION_INTEGRATION_ENABLED)('MCP escrow tools', () => {
  let client: Awaited<ReturnType<typeof createTestClient>>['client'];

  beforeAll(async () => {
    ({ client } = await createTestClient());
  });

  it('deploy-escrow and get-escrow-status integration', async () => {
    const apartmentId = process.env.SAFETRUST_MCP_TEST_APARTMENT_ID!;
    const senderAddress = process.env.SAFETRUST_MCP_TEST_WALLET_ADDRESS!;

    const result = await client.callTool({
      name: 'deploy-escrow',
      arguments: {
        apartmentId,
        senderAddress,
        idempotencyKey: randomUUID(),
      },
    });

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('Unsigned Testnet escrow deployment built');
    expect(text).toContain('pendingActionId:');
    expect(text).toContain('unsignedXDR:');
    const engagementId = text.match(/engagementId: ([^\r\n]+)/)?.[1];
    expect(engagementId).toBeTruthy();

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
