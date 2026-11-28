import { hasuraRequest, isUniqueViolation } from './hasura.js';

/**
 * Durable store behind the Idempotency-Key header.
 *
 * Backed by public.api_idempotency_keys (migration
 * 1791000000000_api_idempotency_keys), written with the Hasura admin secret —
 * the table has no client role permissions.
 */

export type IdempotencyRow = {
  user_id: string;
  key: string;
  route: string;
  status: 'in_progress' | 'completed';
  response_code: number | null;
  response_body: unknown;
  created_at: string;
};

export type ClaimOutcome =
  | { outcome: 'claimed' }
  | { outcome: 'replay'; row: IdempotencyRow }
  | { outcome: 'in_progress'; row: IdempotencyRow }
  | { outcome: 'route_mismatch'; row: IdempotencyRow };

/** A reservation stuck in_progress longer than this is assumed to be from a
 *  crashed request and may be taken over by a retry. */
export const STALE_IN_PROGRESS_MS = 60_000;

const ROW_FIELDS = `
  user_id
  key
  route
  status
  response_code
  response_body
  created_at
`;

async function getIdempotencyRow(userId: string, key: string): Promise<IdempotencyRow | null> {
  const data = await hasuraRequest<{ api_idempotency_keys: IdempotencyRow[] }>(
    `query GetIdempotencyKey($user_id: String!, $key: String!) {
      api_idempotency_keys(where: { user_id: { _eq: $user_id }, key: { _eq: $key } }, limit: 1) {
        ${ROW_FIELDS}
      }
    }`,
    { user_id: userId, key },
  );
  return data.api_idempotency_keys[0] ?? null;
}

/** Reserves the key. Returns false when another request won the race. */
async function reserveIdempotencyKey(userId: string, key: string, route: string): Promise<boolean> {
  try {
    await hasuraRequest(
      `mutation ReserveIdempotencyKey($user_id: String!, $key: String!, $route: String!) {
        insert_api_idempotency_keys_one(
          object: { user_id: $user_id, key: $key, route: $route, status: "in_progress" }
        ) { key }
      }`,
      { user_id: userId, key, route },
    );
    return true;
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }
}

async function deleteStaleInProgress(userId: string, key: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - STALE_IN_PROGRESS_MS).toISOString();
  const data = await hasuraRequest<{ delete_api_idempotency_keys: { affected_rows: number } }>(
    `mutation DeleteStaleIdempotencyKey($user_id: String!, $key: String!, $cutoff: timestamptz!) {
      delete_api_idempotency_keys(
        where: {
          user_id: { _eq: $user_id }
          key: { _eq: $key }
          status: { _eq: "in_progress" }
          created_at: { _lt: $cutoff }
        }
      ) { affected_rows }
    }`,
    { user_id: userId, key, cutoff },
  );
  return data.delete_api_idempotency_keys.affected_rows === 1;
}

async function resolveExisting(row: IdempotencyRow, route: string): Promise<ClaimOutcome> {
  if (row.route !== route) {
    return { outcome: 'route_mismatch', row };
  }
  if (row.status === 'completed') {
    return { outcome: 'replay', row };
  }

  // in_progress: take over when the original request is presumed dead.
  const stale = Date.now() - Date.parse(row.created_at) >= STALE_IN_PROGRESS_MS;
  if (stale && (await deleteStaleInProgress(row.user_id, row.key))) {
    if (await reserveIdempotencyKey(row.user_id, row.key, route)) {
      return { outcome: 'claimed' };
    }
  }
  return { outcome: 'in_progress', row };
}

/**
 * Claims a key for this user/route:
 *  - claimed        → caller may run the handler
 *  - replay         → return the stored response
 *  - in_progress    → another request with this key is still running (409)
 *  - route_mismatch → key was used for a different route (422)
 */
export async function claimIdempotencyKey(
  userId: string,
  key: string,
  route: string,
): Promise<ClaimOutcome> {
  const existing = await getIdempotencyRow(userId, key);
  if (existing) {
    return resolveExisting(existing, route);
  }

  if (await reserveIdempotencyKey(userId, key, route)) {
    return { outcome: 'claimed' };
  }

  // Lost the insert race — evaluate whatever the winner wrote.
  const raced = await getIdempotencyRow(userId, key);
  if (!raced) {
    throw new Error('Idempotency key reservation failed: row vanished after insert conflict');
  }
  return resolveExisting(raced, route);
}

/** Marks the reservation completed and stores the response for replays. */
export async function completeIdempotencyKey(
  userId: string,
  key: string,
  responseCode: number,
  responseBody: unknown,
): Promise<void> {
  await hasuraRequest(
    `mutation CompleteIdempotencyKey($user_id: String!, $key: String!, $response_code: Int!, $response_body: jsonb!) {
      update_api_idempotency_keys(
        where: { user_id: { _eq: $user_id }, key: { _eq: $key }, status: { _eq: "in_progress" } }
        _set: { status: "completed", response_code: $response_code, response_body: $response_body }
      ) { affected_rows }
    }`,
    {
      user_id: userId,
      key,
      response_code: responseCode,
      response_body: responseBody === undefined ? null : responseBody,
    },
  );
}

/** Frees the key after a server error so the client may retry. */
export async function releaseIdempotencyKey(userId: string, key: string): Promise<void> {
  await hasuraRequest(
    `mutation ReleaseIdempotencyKey($user_id: String!, $key: String!) {
      delete_api_idempotency_keys(
        where: { user_id: { _eq: $user_id }, key: { _eq: $key }, status: { _eq: "in_progress" } }
      ) { affected_rows }
    }`,
    { user_id: userId, key },
  );
}
