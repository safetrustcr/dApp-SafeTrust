import { afterEach, describe, expect, it } from 'vitest';

import { bootTestClient } from '../helpers/boot.js';
import { restoreEnv } from '../helpers/env.js';
import { graphqlDocuments, jsonResponse, stubFetch } from '../helpers/fetch.js';
import { jsonOf, textOf, type TestClient } from '../helpers/mcp.js';

const APARTMENT_ID = '11111111-1111-4111-8111-111111111111';
const TENANT = `G${'A'.repeat(55)}`;
const OWNER = `G${'B'.repeat(55)}`;
const XDR = `${'A'.repeat(180)}==`;

let open: TestClient | undefined;

async function boot(env: Record<string, string | undefined> = {}): Promise<TestClient> {
  open = await bootTestClient(env);
  return open;
}

afterEach(async () => {
  await open?.close();
  open = undefined;
  restoreEnv();
});

describe('deploy-escrow', () => {
  it('posts the booking to apps/api and returns the unsigned XDR untouched', async () => {
    const { calls } = stubFetch(() =>
      jsonResponse({ status: 'SUCCESS', contractId: 'CABC', unsignedXDR: XDR, engagementId: 'eng-1' }),
    );
    const { client } = await boot();

    const result = await client.callTool({
      name: 'deploy-escrow',
      arguments: {
        apartmentId: APARTMENT_ID,
        senderAddress: TENANT,
        receiverAddress: OWNER,
        amount: 900,
      },
    });

    expect(calls[0].url).toBe('http://api.test/api/escrow/deploy');
    expect(calls[0].method).toBe('POST');
    const body = JSON.parse(calls[0].body ?? '{}');
    expect(body).toMatchObject({
      apartmentId: APARTMENT_ID,
      senderAddress: TENANT,
      receiverAddress: OWNER,
      amount: 900,
    });
    expect(body.engagementId).toMatch(/^[0-9a-f-]{36}$/);

    const text = textOf(result);
    expect(text).toContain('Escrow deploy initiated.');
    expect(text).toContain(`engagementId: eng-1`);
    expect(text).toContain(`unsignedXDR: ${XDR.slice(0, 48)}… (${XDR.length} chars)`);
    expect(text).toContain('apps/api has no submit route yet');
  });

  it('reuses a caller-supplied engagementId as the idempotency key', async () => {
    const { calls } = stubFetch(() => jsonResponse({ unsignedXDR: XDR, engagementId: 'eng-fixed' }));
    const { client } = await boot();

    await client.callTool({
      name: 'deploy-escrow',
      arguments: {
        apartmentId: APARTMENT_ID,
        senderAddress: TENANT,
        receiverAddress: OWNER,
        amount: 900,
        engagementId: 'eng-fixed',
      },
    });

    expect(JSON.parse(calls[0].body ?? '{}').engagementId).toBe('eng-fixed');
  });

  it('explains an idempotent replay instead of returning a new transaction', async () => {
    stubFetch(() =>
      jsonResponse({ cached: true, engagementId: 'eng-1', contractId: 'CABC', unsignedXDR: XDR }),
    );
    const { client } = await boot();

    const result = await client.callTool({
      name: 'deploy-escrow',
      arguments: { apartmentId: APARTMENT_ID, senderAddress: TENANT, receiverAddress: OWNER, amount: 900 },
    });

    const text = textOf(result);
    expect(text).toContain('Escrow already deployed for this engagementId (idempotent replay).');
    expect(text).toContain('contractId: CABC');
    expect(text).not.toContain('unsignedXDR:');
  });

  it('relays an API rejection with its HTTP status', async () => {
    stubFetch(() =>
      jsonResponse({ error: 'Connect and register the Stellar wallet', details: { code: 'X' } }, 403),
    );
    const { client } = await boot();

    const result = await client.callTool({
      name: 'deploy-escrow',
      arguments: { apartmentId: APARTMENT_ID, senderAddress: TENANT, receiverAddress: OWNER, amount: 900 },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain(
      'Deploy failed (HTTP 403): Connect and register the Stellar wallet',
    );
    expect(jsonOf(result)).toEqual({ code: 'X' });
  });

  it('rejects a malformed Stellar address before any request', async () => {
    const { fetchMock } = stubFetch();
    const { client } = await boot();

    const result = await client.callTool({
      name: 'deploy-escrow',
      arguments: { apartmentId: APARTMENT_ID, senderAddress: 'nope', receiverAddress: OWNER, amount: 900 },
    });

    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('fund-escrow', () => {
  it('builds a funding transaction through apps/api', async () => {
    const { calls } = stubFetch(() => jsonResponse({ unsignedTransaction: XDR }));
    const { client } = await boot();

    const result = await client.callTool({
      name: 'fund-escrow',
      arguments: { contractId: 'CABC', signer: TENANT, amount: 900 },
    });

    expect(calls[0].url).toBe('http://api.test/api/escrow/fund');
    expect(JSON.parse(calls[0].body ?? '{}')).toEqual({
      contractId: 'CABC',
      signer: TENANT,
      amount: 900,
    });
    expect(textOf(result)).toContain('Fund transaction built.');
    expect(textOf(result)).toContain('Sign it with Freighter and submit it through the frontend');
    expect(textOf(result)).toContain(`(${XDR.length} chars)`);
  });
});

describe('get-escrow-status', () => {
  it('requires exactly one identifier', async () => {
    const { fetchMock } = stubFetch();
    const { client } = await boot();

    const neither = await client.callTool({ name: 'get-escrow-status', arguments: {} });
    const both = await client.callTool({
      name: 'get-escrow-status',
      arguments: { contractId: 'CABC', engagementId: 'eng-1' },
    });

    expect(neither.isError).toBe(true);
    expect(textOf(neither)).toContain('Provide either contractId or engagementId');
    expect(both.isError).toBe(true);
    expect(textOf(both)).toContain('Provide only one identifier.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('looks the escrow up with an _or filter and renders the row', async () => {
    const { calls } = stubFetch(() =>
      jsonResponse({
        data: {
          escrows: [
            {
              id: 'esc-1',
              contract_id: 'CABC',
              engagement_id: 'eng-1',
              status: 'funded',
              amount: '900',
              property_id: null,
              apartment_id: APARTMENT_ID,
              sender_address: TENANT,
              receiver_address: OWNER,
              unsigned_xdr: XDR,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-02T00:00:00Z',
            },
          ],
        },
      }),
    );
    const { client } = await boot();

    const result = await client.callTool({
      name: 'get-escrow-status',
      arguments: { contractId: 'CABC' },
    });

    const [query] = graphqlDocuments(calls);
    expect(query).toContain('_or: [');
    expect(query).toContain('contract_id: { _eq: $contractId }');
    expect(query).toContain('limit: 1');

    const text = textOf(result);
    expect(text).toContain('Escrow found.');
    expect(text).toContain('status: funded');
    expect(text).toContain(`unsignedXDR: stored (${XDR.length} chars)`);
    expect(text).toContain(`sender (tenant / approver): ${TENANT}`);
  });

  it('suggests the legacy mirror when the rental table has no row', async () => {
    stubFetch(() => jsonResponse({ data: { escrows: [] } }));
    const { client } = await boot();

    const result = await client.callTool({
      name: 'get-escrow-status',
      arguments: { engagementId: 'eng-missing' },
    });

    expect(textOf(result)).toContain('No escrow found for that identifier in public.escrows.');
    expect(textOf(result)).toContain('try query-trustless-work-escrows instead');
  });
});

describe('orchestrate-escrow', () => {
  it('validates the parameters each step needs', async () => {
    const { fetchMock } = stubFetch();
    const { client } = await boot();

    const start = await client.callTool({ name: 'orchestrate-escrow', arguments: { step: 'start' } });
    const afterDeploy = await client.callTool({
      name: 'orchestrate-escrow',
      arguments: { step: 'after-deploy' },
    });
    const status = await client.callTool({ name: 'orchestrate-escrow', arguments: { step: 'status' } });

    expect(textOf(start)).toContain(
      'For step=start, provide: apartmentId, senderAddress, receiverAddress, amount',
    );
    expect(textOf(afterDeploy)).toContain(
      'For step=after-deploy, provide: contractId, senderAddress, amount',
    );
    expect(textOf(status)).toContain('Provide contractId or engagementId to check status.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('walks deploy → fund without building or signing anything', async () => {
    const { fetchMock } = stubFetch();
    const { client } = await boot();

    const start = await client.callTool({
      name: 'orchestrate-escrow',
      arguments: {
        step: 'start',
        apartmentId: APARTMENT_ID,
        senderAddress: TENANT,
        receiverAddress: OWNER,
        amount: 900,
      },
    });
    const fund = await client.callTool({
      name: 'orchestrate-escrow',
      arguments: { step: 'after-deploy', contractId: 'CABC', senderAddress: TENANT, amount: 900 },
    });
    const funded = await client.callTool({
      name: 'orchestrate-escrow',
      arguments: { step: 'after-fund' },
    });

    expect(textOf(start)).toContain('Step 1: Deploy escrow');
    expect(jsonOf(start)).toEqual({
      apartmentId: APARTMENT_ID,
      senderAddress: TENANT,
      receiverAddress: OWNER,
      amount: 900,
    });
    expect(textOf(fund)).toContain('Step 2: Fund escrow');
    expect(textOf(funded)).toContain('Step 3: Escrow funded');
    expect(textOf(funded)).toContain('disputeResolver');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('explain-escrow-roles', () => {
  it('renders the configured platform wallet and the USDC issuer without any request', async () => {
    const { fetchMock } = stubFetch();
    const { client } = await boot({
      PLATFORM_STELLAR_ADDRESS: 'GPLATFORM',
      NEXT_PUBLIC_USDC_ADDRESS: 'GISSUER',
    });

    const result = await client.callTool({ name: 'explain-escrow-roles', arguments: {} });

    const text = textOf(result);
    expect(text).toContain('GPLATFORM');
    expect(text).toContain('GISSUER');
    expect(text).toContain('apps/api base URL: http://api.test');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('flags the unset platform wallet instead of inventing one', async () => {
    const { client } = await boot();

    const result = await client.callTool({ name: 'explain-escrow-roles', arguments: {} });

    expect(textOf(result)).toContain(
      '(unset — PLATFORM_STELLAR_ADDRESS / NEXT_PUBLIC_PLATFORM_ADDRESS)',
    );
  });
});
