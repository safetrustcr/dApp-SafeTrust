import { randomUUID } from 'node:crypto';
import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';
import { ApiError } from './api-error.js';
import { TrustlessWorkRequestError } from '../services/trustlesswork.js';
import { HasuraRequestError } from '../lib/hasura.js';

const BASE = 'https://api.safetrust.dev/problems';

// ─── Problem Details shape (RFC 7807 + extension members) ──────────────────

type Problem = {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  retryable?: boolean;
};

// ─── requestId middleware ───────────────────────────────────────────────────

/** Safe-ID regex: alphanumeric + hyphens, 8–64 chars */
const SAFE_ID = /^[A-Za-z0-9-]{8,64}$/;

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id');
  const id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.locals['requestId'] = id;
  res.setHeader('X-Request-Id', id);
  next();
};

// ─── 404 catch-all ─────────────────────────────────────────────────────────

export const notFound: RequestHandler = (req, _res, next) =>
  next(new ApiError(404, 'NOT_FOUND', `No route for ${req.method} ${req.path}.`));

// ─── Status → Problem type/title ───────────────────────────────────────────

function byStatus(status: number): Pick<Problem, 'type' | 'title'> {
  if (status === 400) return { type: `${BASE}/validation-error`,    title: 'Invalid request' };
  if (status === 401) return { type: `${BASE}/unauthorized`,        title: 'Authentication required' };
  if (status === 403) return { type: `${BASE}/forbidden`,           title: 'Not allowed' };
  if (status === 404) return { type: `${BASE}/not-found`,           title: 'Not found' };
  if (status === 409) return { type: `${BASE}/conflict`,            title: 'Conflict' };
  if (status === 422) return { type: `${BASE}/rejected`,            title: 'Request rejected' };
  if (status === 502 || status === 504)
    return { type: `${BASE}/upstream-failure`,    title: 'Upstream service failure' };
  if (status === 503) return { type: `${BASE}/service-unavailable`, title: 'Service unavailable' };
  return { type: `${BASE}/internal-error`, title: 'Internal error' };
}

function make(status: number, code: string, detail: string, retryable?: boolean): Problem {
  return { ...byStatus(status), status, code, detail, retryable };
}

// ─── Error → Problem ───────────────────────────────────────────────────────

function toProblem(err: unknown): Problem {
  // 1. Our own typed error — detail is already user-safe
  if (err instanceof ApiError) {
    return make(err.status, err.code, err.detail, err.retryable);
  }

  // 2. TrustlessWork upstream error
  if (err instanceof TrustlessWorkRequestError) {
    const s = err.statusCode;
    if (s === 401 || s === 403) {
      return make(502, 'TRUSTLESS_WORK_AUTH', 'The escrow provider rejected SafeTrust credentials.', false);
    }
    if (s >= 400 && s < 500) {
      return make(422, 'TRUSTLESS_WORK_REJECTED', 'The escrow provider rejected this request. Check the escrow state.', false);
    }
    return make(502, 'TRUSTLESS_WORK_UNAVAILABLE', 'The escrow provider is unavailable. Nothing was changed. Try again.', true);
  }

  // 3. Hasura / database error — never expose query details to the browser
  if (err instanceof HasuraRequestError) {
    return make(502, 'DATABASE_ERROR', 'A database error occurred. Nothing was changed.', false);
  }

  // 4. Well-known transient / config errors
  const e = err as { name?: string; code?: unknown; type?: string };

  if (e.name === 'TimeoutError' || e.name === 'AbortError') {
    return make(504, 'UPSTREAM_TIMEOUT', 'An upstream service timed out. Nothing was changed. Try again.', true);
  }
  if (typeof e.code === 'string' && e.code.startsWith('auth/')) {
    return make(401, 'AUTH_INVALID_TOKEN', 'Your session is invalid or expired. Sign in again.', false);
  }
  if (typeof e.code === 'string' && e.code.startsWith('app/')) {
    return make(503, 'AUTH_NOT_CONFIGURED', 'Authentication is temporarily unavailable.', true);
  }
  if (e.type === 'entity.parse.failed') {
    return make(400, 'INVALID_JSON', 'The request body is not valid JSON.', false);
  }

  return make(500, 'INTERNAL_ERROR', 'Unexpected error.', false);
}

// ─── Global error handler ──────────────────────────────────────────────────

export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const problem = toProblem(err);
  const id = res.locals['requestId'] as string | undefined;

  // Full detail stays server-side only — never send stack traces or upstream
  // payloads to the browser
  console.error(
    JSON.stringify({
      level: 'error',
      requestId: id,
      method: req.method,
      path: req.path,
      status: problem.status,
      code: problem.code,
      error: {
        name: (err as Error)?.name,
        message: (err as Error)?.message,
        stack: (err as Error)?.stack,
        upstreamStatus: err instanceof TrustlessWorkRequestError ? err.statusCode : undefined,
        // Never log Authorization headers, Firebase tokens, private keys or signed XDRs
      },
    }),
  );

  res
    .status(problem.status)
    .type('application/problem+json')
    .json({
      ...problem,
      ...(problem.retryable === undefined && { retryable: undefined }),
      requestId: id,
    });
};
