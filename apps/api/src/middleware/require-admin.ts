import type { NextFunction, Response } from 'express';

import type { AuthenticatedRequest } from './auth.middleware.js';
import { hasuraRequest } from '../services/hasura.js';

/**
 * Resolves authorization from the database immediately before an administrative
 * operation. Firebase proves identity; the database remains the authority for
 * SafeTrust roles, so a forged or stale client-side role can never grant access.
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await hasuraRequest<{
      user_roles: Array<{ role: { name: string } | null }>;
    }>(
      `query ResolveAdminRole($userId: String!) {
        user_roles(where: { user_id: { _eq: $userId } }) {
          role { name }
        }
      }`,
      { userId: req.user.uid },
    );

    if (!data.user_roles.some((assignment) => assignment.role?.name === 'admin')) {
      res.status(403).json({ error: 'Administrator access is required' });
      return;
    }

    req.user.role = 'admin';
    next();
  } catch (error) {
    console.error('[auth/require-admin] Failed to resolve administrator role:', error);
    res.status(503).json({ error: 'Unable to verify administrator access' });
  }
}
