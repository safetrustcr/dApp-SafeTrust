import { Request, Response, NextFunction } from 'express';

export type Tenant = 'safetrust' | 'hotel_industry';

// Extend Express Request globally so req.tenant is typed in all handlers
declare global {
  namespace Express {
    interface Request {
      tenant: Tenant;
    }
  }
}

/**
 * Sets the safe default tenant. A browser-provided X-Tenant-ID is not
 * authoritative; authenticated tenant selection must come from verified claims.
 *
 * Usage in handlers:
 *   req.tenant === 'safetrust'       → query public.apartments, public.escrows
 *   req.tenant === 'hotel_industry'  → query public.hotels, public.reservations
 *
 * Register globally in index.ts BEFORE route handlers:
 *   app.use(tenantMiddleware);
 */
export function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  req.tenant = 'safetrust';
  next();
}