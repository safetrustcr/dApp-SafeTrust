import { afterEach, describe, expect, it } from 'vitest';

import { bootTestClient } from '../helpers/boot.js';
import { restoreEnv } from '../helpers/env.js';
import { graphqlDocuments, jsonResponse, stubFetch, type RecordedCall } from '../helpers/fetch.js';
import { jsonOf, textOf, type TestClient } from '../helpers/mcp.js';

const APARTMENT_ID = '11111111-1111-4111-8111-111111111111';
const TENANT = `G${'A'.repeat(55)}`;
const OWNER = `G${'B'.repeat(55)}`;
const XDR = `AAAAAgAAAA${'A'.repeat(180)}==`;
const ENGAGEMENT = `rental:${APARTMENT_ID}:guest-uid`;

/** Build tools are off by default; on, they act as the Firebase test user. */
const MUTATIONS_ON = {
  SAFETRUST_MCP_ALLOW_MUTATIONS: 'true',
  SAFETRUST_MCP_FIREBASE_API_KEY: 'test-api-key',
  SAFETRUST_MCP_TEST_EMAIL: 'mcp-guest@test.safetrust.dev',
  SAFETRUST_MCP_TEST_PASSWORD: 'test-password',
};

let open: TestClient | undefined;

async function boot(env: Record<string, string | undefined> = {}): Promise<TestClient> {
  open = await bootTestClient({ SAFETRUST_MCP_ALLOW_MUTATIONS: undefined, ...env });
  return open;
}

/** apps/api on Testnet plus a Firebase sign-in; `route` answers the escrow call. */
function testnetApi(route: (call: RecordedCall) => Response) {
  return stubFetch((call) => {
    if (call.url.startsWith('https://identitytoolkit.googleapis.com/')) {
      return jsonResponse({ idToken: 'test-id-token', refreshToken: 'test-refresh', expiresIn: '3600' });
    }
    if (call.url === 'http://api.test/health') return jsonResponse({ status: 'ok', stellarNetwork: 'TESTNET' });
    return route(call);
  });
}

function escrowCalls(calls: RecordedCall[]): RecordedCall[] {
  return calls.filter((call) => call.url.startsWith('http://api.test/api/escrow/'));
}

afterEach(async () => {
  await open?.close();
  open = undefined;
  restoreEnv();
});

describe('deploy-escrow', () => {
  it('is refused without a request while mutations are disabled', async () => {
    const { fetchMock } = stubFetch();
    const { client } = await boot();

    const result = await client.callTool({
      name: 'deploy-escrow',
      arguments: { apartmentId: APARTMENT_ID, senderAddress: TENANT },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('Escrow mutations are disabled.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts only the booking and guest wallet and returns the unsigned XDR untouched', async () => {
    const { calls } = testnetApi(() =>
      jsonResponse({ status: 'SUCCESS', contractId: 'CABC', unsignedXDR: XDR, engagementId: ENGAGEMENT }),
    );
    const { client } = await boot(MUTATIONS_ON);

    const result = await client.callTool({
      name: 'deploy-escrow',
      arguments: { apartmentId: APARTMENT_ID, senderAddress: TENANT },
    });

    const [deploy] = escrowCalls(calls);
    expect(deploy.url).toBe('http://api.test/api/escrow/deploy');
    expect(deploy.method).toBe('POST');
    expect(deploy.headers.Authorization).toBe('Bearer test-id-token');
    expect(deploy.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.parse(deploy.body ?? '{}')).toEqual({ apartmentId: APARTMENT_ID, senderAddress: TENANT });

    const text = textOf(result);
    expect(result.isError).toBeFalsy();
    expect(text).toContain('Unsigned Testnet escrow deployment built.');
    expect(text).toContain(`engagementId: ${ENGAGEMENT}`);
    expect(text).toContain(`unsignedXDR: ${XDR}`);
  });

  it('reuses a caller-supplied idempotency key', async () => {
    const key = '33333333-3333-4333-8333-333333333333';
    const { calls } = testnetApi(() => jsonResponse({ unsignedXDR: XDR, engagementId: ENGAGEMENT }));
    const { client } = await boot(MUTATIONS_ON);

    await client.callTool({
      name: 'deploy-escrow',
      arguments: { apartmentId: APARTMENT_ID, senderAddress: TENANT, idempotencyKey: key },
    });

    expect(escrowCalls(calls)[0].headers['Idempotency-Key']).toBe(key);
  });

  it('explains an idempotent replay instead of returning a new transaction', async () => {
    testnetApi(() => jsonResponse({ cached: true, engagementId: ENGAGEMENT, contractId: 'CABC' }));
    const { client } = await boot(MUTATIONS_ON);

    const result = await client.callTool({
      name: 'deploy-escrow',
      arguments: { apartmentId: APARTMENT_ID, senderAddress: TENANT },
    });

    const text = textOf(result);
    expect(text).toContain('Already deployed for this booking (idempotent replay).');
    expect(text).toContain('contractId: CABC');
    expect(text).not.toContain('unsignedXDR:');
  });

  it('relays only the API message, with its HTTP status', async () => {
    testnetApi(() =>
      jsonResponse(
        {
          type: 'https://safetrust.dev/problems/wallet-not-registered',
          detail: 'Connect and register the Stellar wallet\n    at deployHandler (/app/src/deploy.ts:10:3)',
        },
        403,
      ),
    );
    const { client } = await boot(MUTATIONS_ON);

    const result = await client.callTool({
      name: 'deploy-escrow',
      arguments: { apartmentId: APARTMENT_ID, senderAddress: TENANT },
    });

    const text = textOf(result);
    expect(result.isError).toBe(true);
    expect(text).toContain('Deploy failed (HTTP 403 WALLET_NOT_REGISTERED): Connect and register the Stellar wallet');
    expect(text).not.toContain('deployHandler');
  });

  it('rejects a malformed Stellar address before any request', async () => {
    const { fetchMock } = stubFetch();
    const { client } = await boot(MUTATIONS_ON);

    const result = await client.callTool({
      name: 'deploy-escrow',
      arguments: { apartmentId: APARTMENT_ID, senderAddress: 'nope' },
    });

    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('fund-escrow', () => {
  it('builds a funding transaction from the engagement id alone', async () => {
    const { calls } = testnetApi(() =>
      jsonResponse({ unsignedXdr: XDR, txHash: 'hash-fund', engagementId: ENGAGEMENT, contractId: 'CABC' }),
    );
    const { client } = await boot(MUTATIONS_ON);

    const result = await client.callTool({ name: 'fund-escrow', arguments: { engagementId: ENGAGEMENT } });

    const [fund] = escrowCalls(calls);
    expect(fund.url).toBe('http://api.test/api/escrow/fund');
    expect(JSON.parse(fund.body ?? '{}')).toEqual({ engagementId: ENGAGEMENT });

    const text = textOf(result);
    expect(text).toContain('Unsigned Testnet funding transaction built.');
    expect(text).toContain('txHash: hash-fund');
    expect(text).toContain(`unsignedXDR: ${XDR}`);
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

  it('looks the escrow up with an _or filter and renders the row with redacted wallets', async () => {
    const { calls } = stubFetch((call) => {
      const { query } = JSON.parse(call.body ?? '{}') as { query: string };
      if (query.includes('McpEscrowTransitions')) return jsonResponse({ data: { escrow_transactions: [] } });
      if (query.includes('McpTwMirror')) return jsonResponse({ data: { trustlessWorkEscrows: [{ status: 'funded' }] } });
      return jsonResponse({
        data: {
          escrows: [
            {
              id: 'esc-1',
              contract_id: 'CABC',
              engagement_id: ENGAGEMENT,
              status: 'funded',
              amount: '900',
              tenant_id: 'safetrust',
              sender_address: TENANT,
              receiver_address: OWNER,
              unsigned_xdr: XDR,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-02T00:00:00Z',
            },
          ],
        },
      });
    });
    const { client } = await boot();

    const result = await client.callTool({ name: 'get-escrow-status', arguments: { contractId: 'CABC' } });

    const [query] = graphqlDocuments(calls);
    expect(query).toContain('_or: [');
    expect(query).toContain('contract_id: { _eq: $contractId }');
    expect(query).toContain('limit: 1');

    const text = textOf(result);
    expect(text).toContain(`Escrow ${ENGAGEMENT}: funded`);
    expect(jsonOf(result)).toMatchObject({
      contractId: 'CABC',
      status: 'funded',
      amount: 900,
      guestWallet: 'GAAA…AAAA',
      hostWallet: 'GBBB…BBBB',
      trustlessWorkMirrorStatus: 'funded',
    });
    expect(text).not.toContain(TENANT);
    expect(text).not.toContain(XDR);
  });

  it('reports a missing escrow', async () => {
    stubFetch(() => jsonResponse({ data: { escrows: [] } }));
    const { client } = await boot();

    const result = await client.callTool({
      name: 'get-escrow-status',
      arguments: { engagementId: 'eng-missing' },
    });

    expect(textOf(result)).toBe('No escrow found for eng-missing.');
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
      'For step=start, provide exactly one of apartmentId or reservationId, and senderAddress.',
    );
    expect(textOf(afterDeploy)).toContain('For step=after-deploy, provide engagementId.');
    expect(textOf(status)).toContain('Provide engagementId to check status.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('walks deploy → fund → release without building or signing anything', async () => {
    const { fetchMock } = stubFetch();
    const { client } = await boot();

    const start = await client.callTool({
      name: 'orchestrate-escrow',
      arguments: { step: 'start', apartmentId: APARTMENT_ID, senderAddress: TENANT },
    });
    const fund = await client.callTool({
      name: 'orchestrate-escrow',
      arguments: { step: 'after-deploy', engagementId: ENGAGEMENT },
    });
    const funded = await client.callTool({ name: 'orchestrate-escrow', arguments: { step: 'after-fund' } });

    expect(textOf(start)).toContain('Step 1: Check, then deploy');
    expect(textOf(start)).toContain('deploy-escrow with:');
    expect(textOf(fund)).toContain('Step 2: Fund');
    expect(textOf(fund)).toContain(`fund-escrow { engagementId: "${ENGAGEMENT}" }`);
    expect(textOf(funded)).toContain('Step 3: Milestone and release');
    expect(textOf(funded)).toContain('disputeResolver');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('explain-escrow-roles', () => {
  it('renders the configured platform wallet and the USDC issuer without any request', async () => {
    const { fetchMock } = stubFetch();
    const { client } = await boot({
      PLATFORM_STELLAR_ADDRESS: 'GPLATFORM',
      USDC_TRUSTLINE_ADDRESS: undefined,
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
