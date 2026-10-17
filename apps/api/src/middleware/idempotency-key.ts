import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { AuthenticatedRequest } from './auth.middleware.js';
import {
  claimIdempotencyKey,
  completeIdempotencyKey,
  releaseIdempotencyKey,
} from '../services/idempotency-key.js';

/**
 * Requires an Idempotency-Key header and provides replay protection:
 *
 *  - missing key              → 400 Idempotency-Key required
 *  - new key                  → run the handler, store its response
 *  - key completed            → replay the stored status + body
 *  - key in progress          → 409 Request already in progress
 *  - key used on other route  → 422 Idempotency-Key reused
 *
 * Must run AFTER authenticateFirebase — the key is namespaced by Firebase uid.
 * The response is only sent to the client once the stored outcome has been
 * persisted, so an immediate retry can always replay it.
 */
export function requireIdempotencyKey(route: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    void handle(req, res, next, route);
  };
}

async function handle(
  req: Request,
  res: Response,
  next: NextFunction,
  route: string,
): Promise<void> {
  const key = req.header('Idempotency-Key')?.trim();
  if (!key) {
    res.status(400).json({ error: 'Idempotency-Key required' });
    return;
  }

  const userId = (req as AuthenticatedRequest).user?.uid;
  if (!userId) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }

  try {
    const claim = await claimIdempotencyKey(userId, key, route);

    switch (claim.outcome) {
      case 'route_mismatch':
        res.status(422).json({ error: 'Idempotency-Key reused for a different route' });
        return;
      case 'replay':
        res.setHeader('Idempotent-Replay', 'true');
        res.status(claim.row.response_code ?? 200).json(claim.row.response_body ?? {});
        return;
      case 'in_progress':
        res.status(409).json({ error: 'Request already in progress' });
        return;
      case 'claimed':
        captureResponse(res, userId, key);
        next();
        return;
    }
  } catch (error) {
    console.error('[idempotency] failed to claim key:', error);
    res.status(500).json({ error: 'Failed to validate Idempotency-Key' });
  }
}

/**
 * Persists the handler's response against the reservation before it reaches
 * the client. 5xx responses release the key so a retry can run again.
 */
function captureResponse(res: Response, userId: string, key: string): void {
  const originalJson = res.json.bind(res);
  let pending: Promise<void> = Promise.resolve();

  res.json = ((body: unknown) => {
    const code = typeof res.statusCode === 'number' && res.statusCode > 0 ? res.statusCode : 200;
    pending = (code >= 500
      ? releaseIdempotencyKey(userId, key)
      : completeIdempotencyKey(userId, key, code, body)
    ).catch((error) => {
      console.error('[idempotency] failed to persist response:', error);
    });
    return originalJson(body as never);
  }) as Response['json'];

  const originalEnd = res.end.bind(res);
  res.end = ((...args: unknown[]) => {
    void pending.then(() => originalEnd(...(args as Parameters<typeof originalEnd>)));
    return res;
  }) as Response['end'];
}
