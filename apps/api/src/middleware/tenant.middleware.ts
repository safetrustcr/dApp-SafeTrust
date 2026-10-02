import { Request, Response, NextFunction } from 'express';

const VALID_TENANTS = ['safetrust', 'hotel_industry'] as const;
export type Tenant = (typeof VALID_TENANTS)[number];

// Extend Express Request globally so req.tenant is typed in all handlers
declare global {
  namespace Express {
    interface Request {
      tenant: Tenant;
    }
  }
}

/**
 * Reads X-Tenant-ID header and attaches validated tenant to req.tenant.
 * Defaults to 'safetrust' when header is absent — backward compatible.
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
  res: Response,
  next: NextFunction
): void {
  const tenantHeader = req.headers['x-tenant-id'] as string | undefined;
  const tenantId = tenantHeader ?? 'safetrust';

  if (!VALID_TENANTS.includes(tenantId as Tenant)) {
    res.status(400).json({
      error: 'Invalid X-Tenant-ID',
      message: `Must be one of: ${VALID_TENANTS.join(', ')}`,
      received: tenantId,
    });
    return;
  }

  req.tenant = tenantId as Tenant;
  next();
}