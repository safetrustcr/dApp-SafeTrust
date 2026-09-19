interface HasuraError {
  message: string;
  extensions?: Record<string, unknown>;
}

interface HasuraResponse<T> {
  data?: T;
  errors?: HasuraError[];
}

export async function executeGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const hasuraUrl = process.env.HASURA_GRAPHQL_URL ?? '';
  const hasuraSecret = process.env.HASURA_ADMIN_SECRET ?? '';

  if (!hasuraUrl || !hasuraSecret) {
    throw new Error('Missing required env var: HASURA_GRAPHQL_URL or HASURA_ADMIN_SECRET');
  }

  const response = await fetch(hasuraUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': hasuraSecret,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await response.json()) as HasuraResponse<T>;

  if (json.errors?.length) {
    const error = new Error(json.errors[0].message) as Error & { details: typeof json.errors };
    error.details = json.errors;
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Hasura request failed with status ${response.status}`);
  }

  return json.data as T;
}
