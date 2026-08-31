import { beforeEach, describe, expect, it, vi } from 'vitest';
import { executeGraphQL } from '../hasura.js';

describe('executeGraphQL', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.HASURA_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';
    process.env.HASURA_ADMIN_SECRET = 'myadminsecretkey';
  });

  it('throws an error if HASURA_GRAPHQL_URL or HASURA_ADMIN_SECRET is missing', async () => {
    delete process.env.HASURA_GRAPHQL_URL;
    delete process.env.HASURA_ADMIN_SECRET;

    await expect(executeGraphQL('query { users { id } }')).rejects.toThrow(
      'Missing required env var: HASURA_GRAPHQL_URL or HASURA_ADMIN_SECRET',
    );
  });

  it('sends POST request to Hasura with query and variables', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { users: [{ id: '1' }] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await executeGraphQL<{ users: { id: string }[] }>(
      'query GetUsers($id: String!) { users(where: { id: { _eq: $id } }) { id } }',
      { id: '1' },
    );

    expect(result).toEqual({ users: [{ id: '1' }] });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/v1/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': 'myadminsecretkey',
      },
      body: JSON.stringify({
        query: 'query GetUsers($id: String!) { users(where: { id: { _eq: $id } }) { id } }',
        variables: { id: '1' },
      }),
    });
  });

  it('throws an error when response contains GraphQL errors', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      json: async () => ({
        errors: [{ message: 'field "unknown_field" not found in type: "users"' }],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(executeGraphQL('query { users { unknown_field } }')).rejects.toThrow(
      'field "unknown_field" not found in type: "users"',
    );
  });
});
