import type { ErrorRequestHandler, Request, Response } from 'express';
import { ApiError } from './api-error';
import { v4 as uuidv4 } from 'uuid';

/** RFC 7807 Problem Details error formatter */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const requestId = req.get('X-Request-ID') || uuidv4();
  if (res.headersSent) return next(err);
  const requestId: string = res.locals.requestId ?? req.get('X-Request-ID') ?? uuidv4();
  const apiError = err instanceof ApiError ? err : new ApiError(500, 'INTERNAL_SERVER_ERROR', 'Unexpected server error', { cause: err, requestId });

  // Log the full error server-side
  console.error(`[${requestId}] ${apiError.status} ${apiError.code}: ${apiError.detail}`, apiError.cause);

  // Send standardized response
  res.set('Content-Type', 'application/problem+json');
  res.status(apiError.status).json(apiError.problemDetails);
  res.status(apiError.status).json({ ...apiError.problemDetails, requestId });
};

/** Middleware to attach request ID to all requests */
export const requestIdMiddleware = (req: Request, res: Response, next: () => void) => {
  const requestId = req.get('X-Request-ID') || uuidv4();
  req.set('X-Request-ID', requestId);
  res.locals.requestId = requestId;
  res.set('X-Request-ID', requestId);
  next();
};