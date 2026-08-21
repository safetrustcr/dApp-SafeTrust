import type { NextFunction, Request, Response } from 'express';

export const VALID_TENANTS = ['safetrust', 'hotel_industry'] as const;

export type Tenant = (typeof VALID_TENANTS)[number];

export interface TenantRequest extends Request {
  tenant: Tenant;
}

/**
 * Reads the X-Tenant-ID header and attaches it to req.tenant.
 * Defaults to 'safetrust' for backward compatibility.
 *
 * Usage in routes:
 *   req.tenant === 'safetrust'       → query public.apartments, public.escrows
 *   req.tenant === 'hotel_industry'  → query public.hotels, public.reservations
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  const tenantId = (req.headers['x-tenant-id'] as string | undefined) ?? 'safetrust';

  if (!VALID_TENANTS.includes(tenantId as Tenant)) {
    res.status(400).json({
      error: `Invalid X-Tenant-ID. Must be one of: ${VALID_TENANTS.join(', ')}`,
    });
    return;
  }

  (req as TenantRequest).tenant = tenantId as Tenant;
  next();
}
