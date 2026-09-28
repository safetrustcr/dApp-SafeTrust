import type { RequestHandler, Response } from 'express';
import { hasuraRequest } from '../services/hasura.js';
import type { AuthenticatedRequest } from './auth.middleware.js';

const IDEMPOTENCY_HEADER = 'idempotency-key';

type IdempotencyStatus = 'in_progress' | 'completed';

export type IdempotencyRow = {
  user_id: string;
  key: string;
  route: string;
  status: IdempotencyStatus;
  response_code: number | null;
  response_body: unknown;
};

type ClaimResult = {
  insert_api_idempotency_keys: { affected_rows: number };
};

type LookupResult = {
  api_idempotency_keys: IdempotencyRow[];
};

/**
 * Atomically claims `(userId, key)`.
 *
 * The Hasura mutation is `INSERT ... ON CONFLICT (user_id, key) DO NOTHING`, so
 * the returned `affected_rows` tells us whether this request won the claim (1)
 * or the key already existed (0). That makes concurrent duplicates resolve
 * without a read-modify-write race.
 */
export async function claimIdempotencyKey(
  userId: string,
  key: string,
  route: string,
): Promise<boolean> {
  const data = await hasuraRequest<ClaimResult>(
    `mutation ClaimIdempotencyKey($object: api_idempotency_keys_insert_input!) {
      insert_api_idempotency_keys(
        objects: [$object]
        on_conflict: {
          constraint: api_idempotency_keys_pkey
          update_columns: []
        }
      ) {
        affected_rows
      }
    }`,
    { object: { user_id: userId, key, route, status: 'in_progress' } },
  );

  return data.insert_api_idempotency_keys.affected_rows === 1;
}

export async function getStoredIdempotency(
  userId: string,
  key: string,
): Promise<IdempotencyRow | null> {
  const data = await hasuraRequest<LookupResult>(
    `query GetIdempotencyKey($userId: String!, $key: String!) {
      api_idempotency_keys(
        where: { user_id: { _eq: $userId }, key: { _eq: $key } }
        limit: 1
      ) {
        user_id
        key
        route
        status
        response_code
        response_body
      }
    }`,
    { userId, key },
  );

  return data.api_idempotency_keys[0] ?? null;
}

export async function completeIdempotencyKey(
  userId: string,
  key: string,
  responseCode: number,
  responseBody: unknown,
): Promise<void> {
  await hasuraRequest(
    `mutation CompleteIdempotencyKey(
      $userId: String!
      $key: String!
      $responseCode: Int!
      $responseBody: jsonb!
    ) {
      update_api_idempotency_keys(
        where: { user_id: { _eq: $userId }, key: { _eq: $key } }
        _set: {
          status: "completed"
          response_code: $responseCode
          response_body: $responseBody
        }
      ) {
        affected_rows
      }
    }`,
    { userId, key, responseCode, responseBody },
  );
}

/**
 * `Idempotency-Key` enforcement for the six escrow mutation endpoints.
 *
 * Must be mounted after `authenticateFirebase` (it reads `req.user.uid`) and
 * before the handler.
 *
 * | Situation                                   | Response                              |
 * |---------------------------------------------|---------------------------------------|
 * | Header missing                              | 400 `Idempotency-Key required`        |
 * | New key                                     | run handler, store response, complete |
 * | Key exists and `completed`                  | replay stored status + body           |
 * | Key exists and `in_progress`                | 409 `Request already in progress`      |
 * | Same key sent to a different route          | 422 `Idempotency-Key reused`          |
 */
export const requireIdempotencyKey: RequestHandler = async (req, res, next) => {
  const rawHeader = req.headers[IDEMPOTENCY_HEADER];
  const key = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

  if (typeof key !== 'string' || key.trim().length === 0) {
    res.status(400).json({ error: 'Idempotency-Key required' });
    return;
  }

  const user = (req as AuthenticatedRequest).user;
  if (!user?.uid) {
    res.status(401).json({ error: 'Missing authenticated user' });
    return;
  }

  const route = `${req.baseUrl}${req.path}`;

  let claimed: boolean;
  try {
    claimed = await claimIdempotencyKey(user.uid, key, route);
  } catch (error) {
    next(error);
    return;
  }

  if (!claimed) {
    let stored: IdempotencyRow | null;
    try {
      stored = await getStoredIdempotency(user.uid, key);
    } catch (error) {
      next(error);
      return;
    }

    if (stored && stored.route && stored.route !== route) {
      res.status(422).json({ error: 'Idempotency-Key reused' });
      return;
    }

    if (!stored || stored.status !== 'completed') {
      res.status(409).json({ error: 'Request already in progress' });
      return;
    }

    res.status(stored.response_code ?? 200).json(stored.response_body ?? null);
    return;
  }

  // New key: let the handler run, then persist its response for replays.
  const originalJson = res.json.bind(res);
  let persisted = false;

  res.json = ((body: unknown) => {
    if (!persisted) {
      persisted = true;
      const responseCode = res.statusCode;
      void completeIdempotencyKey(user.uid, key, responseCode, body).catch((error) => {
        console.error('[idempotency] failed to persist response', error);
      });
    }
    return originalJson(body);
  }) as Response['json'];

  next();
};
