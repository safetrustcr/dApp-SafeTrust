import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';

type AllowedRole = 'guest' | 'host' | 'admin';

/**
 * Route-level role guard middleware.
 * Use after authenticateFirebase to restrict routes to specific roles.
 *
 * Usage:
 *   router.post('/host-only', authenticateFirebase, requireRole(['host', 'admin']), handler)
 *
 * req.user.role is set by authenticateFirebase from the user_roles table.
 * Defaults to 'guest' if role is undefined (fails closed to least privilege).
 */
export function requireRole(allowedRoles: AllowedRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const userRole = (req.user?.role ?? 'guest') as AllowedRole;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: 'Forbidden',
        message: `Role '${userRole}' is not permitted for this route. Required: ${allowedRoles.join(' | ')}`,
      });
      return;
    }

    next();
  };
}