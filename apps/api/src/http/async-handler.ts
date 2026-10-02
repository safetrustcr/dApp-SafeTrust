import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from './api-error';

/** Express 4 does not forward rejected promises — this does. */
export function asyncHandler<Req extends Request = Request>(
  fn: (req: Req, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve()
      .then(() => fn(req as Req, res, next))
      .catch((err) => next(err instanceof ApiError ? err : new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected server error', { cause: err })));
  };
}