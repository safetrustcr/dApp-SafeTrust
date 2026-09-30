import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ApiError } from './api-error.js';
import { randomUUID } from 'node:crypto';

/** RFC 7807 Problem Details error formatter */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const requestId = (req.get('X-Request-ID') as string | undefined) || randomUUID();
  const apiError = err instanceof ApiError ? err : new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected server error', { cause: err, requestId });

  // Log the full error server-side
  console.error(`[${requestId}] ${apiError.status} ${apiError.code}: ${apiError.detail}`, apiError.cause);

  // Send standardized response
  res.set('Content-Type', 'application/problem+json');
  res.status(apiError.status).json(apiError.problemDetails);
};

/** Middleware to attach request ID to all requests */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.get('X-Request-ID') as string | undefined) || randomUUID();
  req.headers['x-request-id'] = requestId;
  res.set('X-Request-ID', requestId);
  next();
};