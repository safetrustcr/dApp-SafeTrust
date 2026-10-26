import { afterEach, describe, expect, it } from 'vitest';

import { bootTestClient } from '../helpers/boot.js';
import { restoreEnv } from '../helpers/env.js';
import { graphqlDocuments, jsonResponse, stubFetch } from '../helpers/fetch.js';
import { jsonOf, textOf, type TestClient } from '../helpers/mcp.js';

const APARTMENT_ID = '11111111-1111-4111-8111-111111111111';
const TENANT_ID = '22222222-2222-4222-8222-222222222222';

const APARTMENT_ROW = {
  id: APARTMENT_ID,
  name: 'Escazú loft',
  description: 'Sunny loft',
  price: '900',
  warranty_deposit: '900',
  address: { city: 'San José' },
  is_available: true,
  available_from: '2026-01-01',
  available_until: null,
  image_urls: ['https://cdn.example.com/1.jpg'],
  created_at: '2026-01-01T00:00:00Z',
};

let open: TestClient | undefined;

async function boot(): Promise<TestClient> {
  open = await bootTestClient();
  return open;
}

afterEach(async () => {
  await open?.close();
  open = undefined;
  restoreEnv();
});

describe('list-apartments', () => {
  it('excludes soft-deleted rows and defaults to available listings only', async () => {
    const { calls } = stubFetch(() => jsonResponse({ data: { apartments: [APARTMENT_ROW] } }));
    const { client } = await boot();

    const result = await client.callTool({ name: 'list-apartments', arguments: {} });

    const [query] = graphqlDocuments(calls);
    expect(query).toContain('deleted_at: { _is_null: $deletedAt }');
    expect(query).toContain('is_available: { _eq: $onlyAvailable }');
    expect(JSON.parse(calls[0].body ?? '{}').variables).toEqual({
      onlyAvailable: true,
      deletedAt: true,
    });

    expect(textOf(result)).toContain('1 apartment(s) found.');
    expect(textOf(result)).toContain('Call get-apartment with an id to see the owner Stellar wallet.');
    expect(jsonOf(result)).toEqual([
      {
        id: APARTMENT_ID,
        name: 'Escazú loft',
        price: '900',
        warranty_deposit: '900',
        is_available: true,
      },
    ]);
  });

  it('turns a name search and price bounds into bound variables', async () => {
    const { calls } = stubFetch(() => jsonResponse({ data: { apartments: [] } }));
    const { client } = await boot();

    await client.callTool({
      name: 'list-apartments',
      arguments: { search: 'loft', minPrice: 500, maxPrice: 1500, limit: 7 },
    });

    const [query] = graphqlDocuments(calls);
    expect(query).toContain('$search: String!');
    expect(query).toContain('$minPrice: numeric!');
    expect(query).toContain('$maxPrice: numeric!');
    expect(query).toContain('limit: 7');
    expect(JSON.parse(calls[0].body ?? '{}').variables).toEqual({
      search: '%loft%',
      onlyAvailable: true,
      minPrice: 500,
      maxPrice: 1500,
      deletedAt: true,
    });
  });

  it('reports a filter miss without falling back to fixtures', async () => {
    stubFetch(() => jsonResponse({ data: { apartments: [] } }));
    const { client } = await boot();

    const result = await client.callTool({ name: 'list-apartments', arguments: {} });

    expect(textOf(result)).toBe('No apartments matched those filters.');
  });

  it('reports a Hasura failure as a tool error', async () => {
    stubFetch(() => {
      throw new TypeError('connect ECONNREFUSED');
    });
    const { client } = await boot();

    const result = await client.callTool({ name: 'list-apartments', arguments: {} });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain('Cannot reach Hasura at http://hasura.test/v1/graphql');
  });
});

describe('get-apartment', () => {
  it('returns the owner Stellar wallet that deploy-escrow needs', async () => {
    stubFetch(() =>
      jsonResponse({
        data: {
          apartments: [
            {
              ...APARTMENT_ROW,
              owner: {
                id: TENANT_ID,
                first_name: 'Ana',
                last_name: 'Rojas',
                user_wallets: [{ wallet_address: 'GOWNER', provider: 'freighter' }],
              },
            },
          ],
        },
      }),
    );
    const { client } = await boot();

    const result = await client.callTool({
      name: 'get-apartment',
      arguments: { apartmentId: APARTMENT_ID },
    });

    const text = textOf(result);
    expect(text).toContain('Apartment: Escazú loft');
    expect(text).toContain('warranty_deposit: 900 USDC (the escrow amount)');
    expect(text).toContain('owner: Ana Rojas — user id ' + TENANT_ID);
    expect(text).toContain('owner wallet (ownerAddress for deploy-escrow): GOWNER');
  });

  it('warns when the owner has no STELLAR wallet', async () => {
    stubFetch(() =>
      jsonResponse({
        data: {
          apartments: [{ ...APARTMENT_ROW, owner: { id: TENANT_ID, first_name: null, last_name: null, user_wallets: [] } }],
        },
      }),
    );
    const { client } = await boot();

    const result = await client.callTool({
      name: 'get-apartment',
      arguments: { apartmentId: APARTMENT_ID },
    });

    expect(textOf(result)).toContain(
      'owner has no STELLAR wallet in public.user_wallets — deploy-escrow will be blocked',
    );
  });

  it('reports an unknown apartment', async () => {
    stubFetch(() => jsonResponse({ data: { apartments: [] } }));
    const { client } = await boot();

    const result = await client.callTool({
      name: 'get-apartment',
      arguments: { apartmentId: APARTMENT_ID },
    });

    expect(textOf(result)).toBe(`No apartment found with id ${APARTMENT_ID}.`);
  });

  it('rejects a non-UUID id before touching Hasura', async () => {
    const { fetchMock } = stubFetch();
    const { client } = await boot();

    const result = await client.callTool({
      name: 'get-apartment',
      arguments: { apartmentId: 'not-a-uuid' },
    });

    expect(result.isError).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
