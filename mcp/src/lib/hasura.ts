import { HASURA_GRAPHQL_URL, REQUEST_TIMEOUT_MS } from '../config.js';

export class HasuraRequestError extends Error {
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HasuraRequestError';
  }
}

/**
 * Runs a GraphQL operation against Hasura with the admin secret.
 * Mirrors apps/api/src/services/hasura.ts — the MCP server is a local developer
 * tool, so it talks to Hasura with admin rights and bypasses row permissions.
 */
export async function hasuraRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const adminSecret = process.env.HASURA_ADMIN_SECRET;
  if (!adminSecret) {
    throw new Error(
      '[safetrust-mcp] HASURA_ADMIN_SECRET is not set. ' +
      'Copy mcp/.env.example to mcp/.env and fill in the value.'
    );
  }

  let response: Response;

  try {
    response = await fetch(HASURA_GRAPHQL_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': adminSecret,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (error) {
    throw new HasuraRequestError(
      `Cannot reach Hasura at ${HASURA_GRAPHQL_URL} — is dc_prep running? ` +
        (error instanceof Error ? error.message : String(error)),
    );
  }

  const text = await response.text();
  let json: { data?: T; errors?: { message: string }[] };

  try {
    json = (text ? JSON.parse(text) : {}) as typeof json;
  } catch {
    throw new HasuraRequestError(
      `Hasura returned a non-JSON response (${response.status}): ${text.slice(0, 200)}`,
    );
  }

  if (!response.ok) {
    throw new HasuraRequestError(
      json.errors?.map((e) => e.message).join(', ') ??
        `Hasura request failed (${response.status})`,
      json.errors,
    );
  }

  if (json.errors?.length) {
    throw new HasuraRequestError(json.errors.map((e) => e.message).join(', '), json.errors);
  }

  if (!json.data) {
    throw new HasuraRequestError('Hasura response missing data');
  }

  return json.data;
}

export type WhereClause = {
  /** `($a: String!, $b: Int)` or `` when nothing is bound. */
  variableDefinitions: string;
  /** A `where:` argument, or `` when no filter applies. */
  whereArgument: string;
  variables: Record<string, unknown>;
  isEmpty: boolean;
};

/** One optional filter: variable name, GraphQL type, boolean expression, value. */
export type Filter = [name: string, gqlType: string, expression: string, value: unknown];

/**
 * Builds a where clause from the filters the caller actually passed.
 *
 * GraphQL rejects variables that are declared but never used, so the declarations
 * and the boolean expressions have to be assembled together instead of
 * interpolating optional fragments into a fixed query string.
 */
export function buildWhere(filters: Filter[], combinator: '_and' | '_or' = '_and'): WhereClause {
  const active = filters.filter(
    ([, , , value]) => value !== undefined && value !== null && value !== '',
  );

  if (active.length === 0) {
    return { variableDefinitions: '', whereArgument: '', variables: {}, isEmpty: true };
  }

  const variables: Record<string, unknown> = {};
  for (const [name, , , value] of active) {
    variables[name] = value;
  }

  return {
    variableDefinitions: `(${active.map(([name, gqlType]) => `$${name}: ${gqlType}`).join(', ')})`,
    whereArgument: `where: { ${combinator}: [${active.map(([, , expression]) => expression).join(', ')}] }`,
    variables,
    isEmpty: false,
  };
}
