interface HasuraResponse<T> {
  data?:   T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

const HASURA_URL    = process.env.HASURA_GRAPHQL_URL    ?? '';
const HASURA_SECRET = process.env.HASURA_ADMIN_SECRET   ?? '';

/**
 * Reusable GraphQL executor.
 * Throws HasuraRequestError when the response contains GraphQL errors.
 * Used by all apps/api route handlers — eliminates header boilerplate.
 */
export async function executeGraphQL<T>(
  query:     string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const hasuraUrl = process.env.HASURA_GRAPHQL_URL ?? HASURA_URL;
  const hasuraSecret = process.env.HASURA_ADMIN_SECRET ?? HASURA_SECRET;

  if (!hasuraUrl || !hasuraSecret) {
    throw new Error('Missing required env var: HASURA_GRAPHQL_URL or HASURA_ADMIN_SECRET');
  }

  const res = await fetch(hasuraUrl, {
    method:  'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-hasura-admin-secret': hasuraSecret,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as HasuraResponse<T>;

  if (json.errors?.length) {
    const err = new Error(json.errors[0].message) as Error & { details: typeof json.errors };
    err.details = json.errors;
    throw err;
  }

  return json.data as T;
}
