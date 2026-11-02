import { afterEach, describe, expect, it } from 'vitest';

import { jsonResponse, stubFetch, textResponse } from '../helpers/fetch.js';
import { loadFresh, restoreEnv } from '../helpers/env.js';

type HasuraModule = typeof import('../../src/lib/hasura.js');

const BASE = 'http://hasura.test/v1/graphql';

function loadHasura(env: Record<string, string | undefined> = {}): Promise<HasuraModule> {
  return loadFresh<HasuraModule>(
    {
      HASURA_GRAPHQL_URL: BASE,
      HASURA_ADMIN_SECRET: 'test-admin-secret',
      HASURA_GRAPHQL_ADMIN_SECRET: undefined,
      ...env,
    },
    () => import('../../src/lib/hasura.js'),
  );
}

afterEach(restoreEnv);

describe('hasuraRequest', () => {
  it('refuses to run without an admin secret instead of falling back to a default', async () => {
    const { fetchMock } = stubFetch();
    const { hasuraRequest } = await loadHasura({
      HASURA_ADMIN_SECRET: undefined,
      HASURA_GRAPHQL_ADMIN_SECRET: undefined,
    });

    await expect(hasuraRequest('query { apartments { id } }')).rejects.toThrow(
      /HASURA_ADMIN_SECRET is not set/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts the query and variables with the admin secret header', async () => {
    const { calls } = stubFetch(() => jsonResponse({ data: { apartments: [] } }));
    const { hasuraRequest } = await loadHasura();

    await hasuraRequest('query GetApartment($id: uuid!) { apartments { id } }', { id: 'apt-1' });

    expect(calls[0].url).toBe(BASE);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers['x-hasura-admin-secret']).toBe('test-admin-secret');
    expect(calls[0].headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(calls[0].body ?? '{}')).toEqual({
      query: 'query GetApartment($id: uuid!) { apartments { id } }',
      variables: { id: 'apt-1' },
    });
  });

  it('returns data from a successful response', async () => {
    stubFetch(() => jsonResponse({ data: { escrows: [{ id: 'esc-1' }] } }));
    const { hasuraRequest } = await loadHasura();

    const data = await hasuraRequest<{ escrows: Array<{ id: string }> }>('query { escrows { id } }');

    expect(data).toEqual({ escrows: [{ id: 'esc-1' }] });
  });

  it('surfaces GraphQL errors from a 200 response with their details', async () => {
    stubFetch(() =>
      jsonResponse({ errors: [{ message: 'field "nope" not found' }] }),
    );
    const { hasuraRequest, HasuraRequestError } = await loadHasura();

    const error = await hasuraRequest('query { nope }').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(HasuraRequestError);
    expect((error as Error).message).toBe('field "nope" not found');
    expect((error as InstanceType<typeof HasuraRequestError>).details).toEqual([
      { message: 'field "nope" not found' },
    ]);
  });

  it('turns a non-2xx response into a HasuraRequestError', async () => {
    stubFetch(() => jsonResponse({ errors: [{ message: 'unauthorized' }] }, 401));
    const { hasuraRequest, HasuraRequestError } = await loadHasura();

    await expect(hasuraRequest('query { escrows { id } }')).rejects.toThrow(HasuraRequestError);
    await expect(hasuraRequest('query { escrows { id } }')).rejects.toThrow('unauthorized');
  });

  it('rejects a non-JSON response body', async () => {
    stubFetch(() => textResponse('<html>gateway</html>', 502));
    const { hasuraRequest } = await loadHasura();

    await expect(hasuraRequest('query { escrows { id } }')).rejects.toThrow(
      /Hasura returned a non-JSON response \(502\)/,
    );
  });

  it('rejects a response that carries neither data nor errors', async () => {
    stubFetch(() => jsonResponse({}));
    const { hasuraRequest } = await loadHasura();

    await expect(hasuraRequest('query { escrows { id } }')).rejects.toThrow(
      'Hasura response missing data',
    );
  });

  it('reports an unreachable Hasura with the startup hint', async () => {
    stubFetch(() => {
      throw new TypeError('connect ECONNREFUSED');
    });
    const { hasuraRequest } = await loadHasura();

    await expect(hasuraRequest('query { escrows { id } }')).rejects.toThrow(
      `Cannot reach Hasura at ${BASE}`,
    );
  });
});

describe('buildWhere', () => {
  it.each([
    ['no filters', []],
    ['undefined values', [['status', 'String!', '{ status: { _eq: $status } }', undefined]]],
    ['null values', [['status', 'String!', '{ status: { _eq: $status } }', null]]],
    ['empty strings', [['search', 'String!', '{ name: { _ilike: $search } }', '']]],
  ])('renders nothing for %s', async (_label, filters) => {
    const { buildWhere } = await loadHasura();

    expect(buildWhere(filters as never)).toEqual({
      variableDefinitions: '',
      whereArgument: '',
      variables: {},
      isEmpty: true,
    });
  });

  it('declares and binds only the filters that were passed', async () => {
    const { buildWhere } = await loadHasura();

    const where = buildWhere([
      ['status', 'String!', '{ status: { _eq: $status } }', 'funded'],
      ['apartmentId', 'uuid!', '{ apartment_id: { _eq: $apartmentId } }', undefined],
    ]);

    expect(where.isEmpty).toBe(false);
    expect(where.variableDefinitions).toBe('($status: String!)');
    expect(where.whereArgument).toBe('where: { _and: [{ status: { _eq: $status } }] }');
    expect(where.variables).toEqual({ status: 'funded' });
  });

  it('supports the _or combinator used by get-escrow-status', async () => {
    const { buildWhere } = await loadHasura();

    const where = buildWhere(
      [
        ['contractId', 'String!', '{ contract_id: { _eq: $contractId } }', 'C1'],
        ['engagementId', 'String!', '{ engagement_id: { _eq: $engagementId } }', undefined],
      ],
      '_or',
    );

    expect(where.whereArgument).toBe('where: { _or: [{ contract_id: { _eq: $contractId } }] }');
    expect(where.variables).toEqual({ contractId: 'C1' });
  });
});
