/**
 * Shared Hasura GraphQL executor for apps/api route handlers.
 *
 * Eliminates the 8-line fetch boilerplate that would otherwise appear in
 * every handler. Centralises env var validation so missing config surfaces
 * as a clear error instead of "TypeError: Failed to parse URL from undefined".
 *
 * NOTE: This is a server-side lib/ helper distinct from services/hasura.ts
 * (which is used by the middleware services layer). Both call Hasura with
 * admin credentials — lib/hasura.ts is the entry point for route handlers,
 * services/hasura.ts is used by idempotency and escrow services.
 */

export class HasuraRequestError extends Error {
  public readonly details: Array<{ message: string; extensions?: Record<string, unknown> }>;

  constructor(
    message: string,
    details: Array<{ message: string; extensions?: Record<string, unknown> }>
  ) {
    super(message);
    this.name = 'HasuraRequestError';
    this.details = details;
  }
}

interface HasuraResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

/**
 * Execute a GraphQL query or mutation against Hasura with admin credentials.
 *
 * Throws HasuraRequestError when Hasura returns a GraphQL errors field.
 * Throws Error when env vars are missing or the HTTP request fails.
 *
 * @param query     GraphQL query or mutation string
 * @param variables Optional variables object
 * @returns         The data field of the Hasura response
 */
export async function executeGraphQL<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const hasuraUrl    = process.env.HASURA_GRAPHQL_URL    ?? '';
  const adminSecret  = process.env.HASURA_ADMIN_SECRET   ?? '';

  if (!hasuraUrl || !adminSecret) {
    throw new Error(
      'Missing required env var: HASURA_GRAPHQL_URL or HASURA_ADMIN_SECRET'
    );
  }

  const res = await fetch(hasuraUrl, {
    method: 'POST',
    headers: {
      'Content-Type':          'application/json',
      'x-hasura-admin-secret': adminSecret,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(
      `Hasura returned HTTP ${res.status}: ${res.statusText}`
    );
  }

  const json = (await res.json()) as HasuraResponse<T>;

  if (json.errors?.length) {
    throw new HasuraRequestError(json.errors[0].message, json.errors);
  }

  return json.data as T;
}