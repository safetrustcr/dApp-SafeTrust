/**
 * Shared role constants and helpers for middleware and client code.
 * Keep this file free of Node.js-only imports — it runs in the Edge runtime.
 */

export const ROLE_COOKIE         = 'user-role' as const;
export const ROLE_COOKIE_MAX_AGE = 60 * 60; // 1 hour in seconds
export const DEFAULT_ROLE        = 'guest'   as const;

/** All valid SafeTrust user roles */
export const USER_ROLES = ['guest', 'host', 'admin'] as const;
export type UserRole = typeof USER_ROLES[number];

/**
 * Precedence order — higher index = higher privilege.
 * resolveHighestRole picks the entry with the highest index.
 */
export const ROLE_PRECEDENCE: readonly UserRole[] = ['guest', 'host', 'admin'];

/**
 * Returns true when value is a recognised UserRole.
 * Used to validate cookie values and DB results before trusting them.
 */
export function isUserRole(value: string | undefined): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

/**
 * Picks the highest-privilege role from a set of assignments.
 *
 * A user may hold multiple role rows (e.g. guest + host after promotion).
 * We always return the most permissive one.
 *
 * continue behaviour: if a name is not a valid role (undefined, null, unknown
 * string) the loop skips that iteration entirely and moves to the next name.
 * It does NOT exit the loop — that would be break.
 *
 * Example: ['guest', undefined, 'host'] → 'host'
 */
export function resolveHighestRole(names: readonly (string | undefined)[]): UserRole {
  let resolved: UserRole = DEFAULT_ROLE;

  for (const name of names) {
    if (!isUserRole(name)) continue; // invalid entry → skip, check next name
    if (ROLE_PRECEDENCE.indexOf(name) > ROLE_PRECEDENCE.indexOf(resolved)) {
      resolved = name; // found a higher-privilege role — promote
    }
  }

  return resolved;
}

/**
 * Maps a role to its home dashboard route.
 * Used by the middleware to redirect after login.
 */
export function dashboardHomeForRole(role: UserRole): string {
  switch (role) {
    case 'admin': return '/dashboard/users';
    case 'host':  return '/dashboard/escrow-dashboard';
    case 'guest':
    default:      return '/dashboard/guest';
  }
}