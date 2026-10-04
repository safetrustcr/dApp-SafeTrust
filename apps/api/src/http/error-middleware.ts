import type { ErrorRequestHandler, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ApiError } from './api-error.js';

/** RFC 7807 Problem Details error formatter */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  const requestId: string = res.locals.requestId ?? req.get('X-Request-ID') ?? randomUUID();
  const apiError = err instanceof ApiError ? err : new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected server error', { cause: err, requestId });

  // Log the full error server-side
  console.error(`[${requestId}] ${apiError.status} ${apiError.code}: ${apiError.detail}`, apiError.cause);

  // Send standardized response
  res.set('Content-Type', 'application/problem+json');
  res.status(apiError.status).json({ ...apiError.problemDetails, requestId });
};

/** Middleware to attach request ID to all requests */
export const requestIdMiddleware = (req: Request, res: Response, next: () => void) => {
  const requestId = req.get('X-Request-ID') || randomUUID();
  req.headers['x-request-id'] = requestId;
  res.locals.requestId = requestId;
  res.set('X-Request-ID', requestId);
  next();
};