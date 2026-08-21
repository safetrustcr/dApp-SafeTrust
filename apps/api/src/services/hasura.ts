const HASURA_URL = process.env.HASURA_GRAPHQL_URL ?? 'http://localhost:8080/v1/graphql';

export class HasuraRequestError extends Error {
  constructor(message: string, readonly details?: unknown) {
    super(message);
    this.name = 'HasuraRequestError';
  }
}

/**
 * Executes a GraphQL operation against Hasura with the admin secret.
 * Server-side only — the admin secret must never reach the browser.
 */
export async function hasuraRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const adminSecret = process.env.HASURA_ADMIN_SECRET;
  if (!adminSecret) {
    throw new HasuraRequestError('Missing required env var: HASURA_ADMIN_SECRET');
  }

  const response = await fetch(HASURA_URL, {
    method: 'POST',
    signal: AbortSignal.timeout(15_000),
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': adminSecret,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await response.text();
  const json = (text ? JSON.parse(text) : {}) as {
    data?: T;
    errors?: { message: string }[];
  };

  if (!response.ok) {
    const message =
      json.errors?.map((e) => e.message).join(', ') ??
      `Hasura request failed (${response.status})`;
    throw new HasuraRequestError(message, json.errors);
  }

  if (json.errors?.length) {
    throw new HasuraRequestError(json.errors.map((e) => e.message).join(', '), json.errors);
  }

  if (!json.data) {
    throw new HasuraRequestError('Hasura response missing data');
  }

  return json.data;
}
