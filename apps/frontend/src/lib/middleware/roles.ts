// Role vocabulary shared by the middleware, the role cache cookie and the
// promote-to-host flow. These names mirror `public.roles.name` in Hasura.
//
// NOTE: utils/role-utils.ts uses 'hotel' for the listing-side role; that helper
// derives a role from a wallet address and is unrelated to the Hasura-backed
// roles resolved here, which use 'host' (per issue #287).
export type UserRole = 'guest' | 'host' | 'admin';

export const ROLE_COOKIE = 'user-role';

/** Cache TTL for the role cookie, in seconds. */
export const ROLE_COOKIE_MAX_AGE = 60 * 60;

/**
 * Highest privilege last. A user may hold several roles at once (a host can
 * still book as a guest), so role resolution is deterministic: the most
 * privileged assignment wins rather than whichever row Hasura returns first.
 */
const ROLE_PRECEDENCE: readonly UserRole[] = ['guest', 'host', 'admin'];

export const DEFAULT_ROLE: UserRole = 'guest';

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && ROLE_PRECEDENCE.includes(value as UserRole);
}

/** Picks the highest-privilege role from a set of assignments. */
export function resolveHighestRole(names: readonly (string | undefined)[]): UserRole {
  let resolved: UserRole = DEFAULT_ROLE;

  for (const name of names) {
    if (!isUserRole(name)) continue;
    if (ROLE_PRECEDENCE.indexOf(name) > ROLE_PRECEDENCE.indexOf(resolved)) {
      resolved = name;
    }
  }

  return resolved;
}

/** Landing page for a role when it hits the /dashboard root. */
export function dashboardHomeForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/dashboard/users';
    case 'host':
      return '/dashboard/escrow-dashboard';
    default:
      return '/dashboard/guest';
  }
}
