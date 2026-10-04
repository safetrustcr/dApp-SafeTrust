import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from './api-error.js';

/**
 * Express 4 does not forward rejected promises — this wrapper does.
 *
 * Wraps any async route handler so that an unhandled rejection is forwarded
 * to next(err) instead of becoming an unhandled rejection or a hung request.
 *
 * Also converts non-ApiError errors to ApiError for consistent error handling.
 *
 * Usage:
 *   router.post('/path', asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req as Req, res, next))
      .catch((err) => next(err instanceof ApiError ? err : new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected server error', { cause: err })));
  };
}
