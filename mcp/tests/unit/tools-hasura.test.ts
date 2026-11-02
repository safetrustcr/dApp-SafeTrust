import { afterEach, describe, expect, it } from 'vitest';

import { bootTestClient } from '../helpers/boot.js';
import { restoreEnv } from '../helpers/env.js';
import { graphqlDocuments, jsonResponse, stubFetch } from '../helpers/fetch.js';
import { jsonOf, listToolNames, textOf, type TestClient } from '../helpers/mcp.js';

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

describe('hasura-query registration', () => {
  it('is not registered by default', async () => {
    const { client } = await boot();

    expect(await listToolNames(client)).not.toContain('hasura-query');
  });

  it('is registered only with SAFETRUST_MCP_ENABLE_RAW_HASURA=true', async () => {
    const { client } = await boot({ SAFETRUST_MCP_ENABLE_RAW_HASURA: 'true' });

    expect(await listToolNames(client)).toContain('hasura-query');
  });

  it.each([
    ['a mutation', 'mutation Nuke { delete_apartments(where: {}) { affected_rows } }'],
    ['a subscription', 'subscription Watch { escrows { id } }'],
    ['an insert_ root field', '{ insert_escrows_one(object: {}) { id } }'],
    ['an update_ root field', '{ update_escrows(_set: {}) { affected_rows } }'],
    ['a delete_ root field', '{ delete_escrows { affected_rows } }'],
  ])('still refuses %s when enabled', async (_label, query) => {
    const { fetchMock } = stubFetch();
    const { client } = await boot({ SAFETRUST_MCP_ENABLE_RAW_HASURA: 'true' });

    const result = await client.callTool({ name: 'hasura-query', arguments: { query } });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('Refused: this tool only runs read-only queries.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('runs an allowed read query and returns the raw JSON', async () => {
    stubFetch(() => jsonResponse({ data: { bids: [{ id: 'bid-1' }] } }));
    const { client } = await boot({ SAFETRUST_MCP_ENABLE_RAW_HASURA: 'true' });

    const result = await client.callTool({
      name: 'hasura-query',
      arguments: { query: 'query { bids { id } }' },
    });

    expect(result.isError).toBeFalsy();
    expect(textOf(result)).toContain('http://hasura.test/v1/graphql');
    expect(jsonOf(result)).toEqual({ bids: [{ id: 'bid-1' }] });
  });
});

describe('query-escrows', () => {
  it('filters by the arguments that were passed and renders the rows', async () => {
    const { calls } = stubFetch(() =>
      jsonResponse({
        data: {
          escrows: [
            {
              id: 'esc-1',
              contract_id: 'C1',
              engagement_id: 'rental:apt-1:uid',
              status: 'funded',
              amount: '1200',
              apartment_id: 'apt-1',
            },
          ],
        },
      }),
    );
    const { client } = await boot();

    const result = await client.callTool({
      name: 'query-escrows',
      arguments: { status: 'funded', apartmentId: '11111111-1111-4111-8111-111111111111', limit: 5 },
    });

    const [query] = graphqlDocuments(calls);
    expect(query).toContain('$status: String!');
    expect(query).toContain('$apartmentId: uuid!');
    expect(query).not.toContain('$senderAddress');
    expect(query).toContain('limit: 5');
    expect(JSON.parse(calls[0].body ?? '{}').variables).toEqual({
      status: 'funded',
      apartmentId: '11111111-1111-4111-8111-111111111111',
    });

    expect(textOf(result)).toContain('1 escrow row(s).');
    expect(jsonOf(result)).toEqual([
      expect.objectContaining({ id: 'esc-1', status: 'funded', amount: '1200' }),
    ]);
  });

  it('reports an empty result set', async () => {
    stubFetch(() => jsonResponse({ data: { escrows: [] } }));
    const { client } = await boot();

    const result = await client.callTool({ name: 'query-escrows', arguments: {} });

    expect(textOf(result)).toContain('0 escrow row(s).');
  });

  it('surfaces Hasura failures as tool errors', async () => {
    stubFetch(() => jsonResponse({ errors: [{ message: 'permission denied' }] }, 403));
    const { client } = await boot();

    const result = await client.callTool({ name: 'query-escrows', arguments: {} });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('permission denied');
  });
});

describe('query-trustless-work-escrows', () => {
  it('queries the camelCase mirror and explains the role columns', async () => {
    const { calls } = stubFetch(() =>
      jsonResponse({
        data: { trustlessWorkEscrows: [{ id: 'tw-1', marker: 'GOWNER', approver: 'GTENANT' }] },
      }),
    );
    const { client } = await boot();

    const result = await client.callTool({
      name: 'query-trustless-work-escrows',
      arguments: { status: 'funded' },
    });

    expect(graphqlDocuments(calls)[0]).toContain('trustlessWorkEscrows');
    expect(textOf(result)).toContain('1 trustless_work_escrows row(s).');
    expect(textOf(result)).toContain(
      'marker = owner wallet, approver = tenant wallet, releaser/resolver = platform wallet.',
    );
    expect(jsonOf(result)).toEqual([{ id: 'tw-1', marker: 'GOWNER', approver: 'GTENANT' }]);
  });
});

describe('query-user-wallets', () => {
  it('refuses to run without a filter and never calls Hasura', async () => {
    const { fetchMock } = stubFetch();
    const { client } = await boot();

    const result = await client.callTool({ name: 'query-user-wallets', arguments: {} });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('Provide at least one of userId, email or walletAddress.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resolves an email through the joined user row', async () => {
    const { calls } = stubFetch(() =>
      jsonResponse({
        data: {
          user_wallets: [
            {
              id: 'w1',
              wallet_address: 'G…',
              chain_type: 'STELLAR',
              is_primary: true,
              user: { email: 'guest@example.com' },
            },
          ],
        },
      }),
    );
    const { client } = await boot();

    const result = await client.callTool({
      name: 'query-user-wallets',
      arguments: { email: 'guest@example.com' },
    });

    const [query] = graphqlDocuments(calls);
    expect(query).toContain('$email: String!');
    expect(query).toContain('user: { email: { _eq: $email } }');
    expect(textOf(result)).toContain('1 wallet(s).');
  });
});
