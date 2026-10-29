import { getHasuraConfig, REQUEST_TIMEOUT_MS } from '../config.js';

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
 * Runs a GraphQL operation against Hasura while assuming the constrained
 * mcp_reader role. The admin secret authenticates the local MCP server; it does
 * not grant the query the admin role.
 */
export async function hasuraRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const { url, adminSecret } = getHasuraConfig();
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': adminSecret,
        'x-hasura-role': 'mcp_reader',
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new HasuraRequestError('Cannot reach local Hasura. Is infra/backend/bin/start running?');
  }

  const text = await response.text();
  let json: { data?: T; errors?: { message: string }[] };

  try {
    json = (text ? JSON.parse(text) : {}) as typeof json;
  } catch {
    throw new HasuraRequestError(`Hasura returned an invalid response (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    throw new HasuraRequestError(`Hasura request failed (HTTP ${response.status}).`);
  }

  if (json.errors?.length) {
    throw new HasuraRequestError('Hasura rejected the query.');
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
