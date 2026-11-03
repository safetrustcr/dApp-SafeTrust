import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ApiError } from '../http/api-error.js';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string | undefined;
  /** Problem Details code sent with the 429. */
  message?: string;
};

type Bucket = { count: number; resetAt: number };

/**
 * Fixed-window, in-memory rate limiter.
 *
 * Counters live in this process only, so the limit is per API instance. Must
 * run AFTER authenticateFirebase when keyGenerator reads req.user.
 */
export function rateLimit(options: RateLimitOptions): RequestHandler {
  const { windowMs, max, message = 'TOO_MANY_REQUESTS' } = options;
  const keyGenerator = options.keyGenerator ?? ((req: Request) => req.ip);
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = keyGenerator(req) ?? 'unknown';

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    // Drop expired buckets so the map doesn't grow without bound.
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      next(new ApiError(429, message, 'Too many requests. Try again shortly.', { retryable: true }));
      return;
    }
    next();
  };
}
