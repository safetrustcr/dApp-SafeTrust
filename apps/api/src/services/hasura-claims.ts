/**
 * Hasura JWT claims for Firebase users.
 *
 * Hasura runs in JWT mode (HASURA_GRAPHQL_JWT_SECRET). It trusts only the roles
 * listed in the signed token's `x-hasura-allowed-roles`; a browser may *choose*
 * one of them with the `x-hasura-role` header but can never add a role. These
 * claims are therefore set here, server-side, from database state:
 *
 *   SafeTrust roles  (public.user_roles → roles.name)     → guest | host | admin
 *   Hotel manager    (hotel_industry.users.role = MANAGER) → hotel_manager
 *   Hotel staff      (hotel_industry.users.role = STAFF)   → hotel_staff
 *
 * After changing claims, the client must refresh its ID token
 * (`auth.currentUser.getIdToken(true)`) before the new role takes effect.
 */
import { getAuth } from 'firebase-admin/auth';
import { executeGraphQL } from '../lib/hasura.js';

export const HASURA_CLAIMS_NAMESPACE = 'https://hasura.io/jwt/claims';

/**
 * SafeTrust role name (roles.name) → Hasura role used in safetrust metadata.
 * ⚠️ Must match the role names in infra/backend/metadata/tenants/safetrust/**
 * (run: grep -rh "role:" infra/backend/metadata/tenants/safetrust | sort | uniq -c).
 */
export const SAFETRUST_HASURA_ROLE: Readonly<Record<string, string>> = {
  guest: 'guest',
  host: 'host',
  admin: 'admin',
};

export const HOTEL_MANAGER_ROLE = 'hotel_manager';
export const HOTEL_STAFF_ROLE = 'hotel_staff';

/** Highest privilege first — the default role is the first one the user holds. */
const DEFAULT_ROLE_PRIORITY = ['admin', 'host', 'guest', HOTEL_MANAGER_ROLE, HOTEL_STAFF_ROLE];

export type HotelUserRole = 'GUEST' | 'STAFF' | 'MANAGER';

export type HasuraClaims = {
  'x-hasura-default-role': string;
  'x-hasura-allowed-roles': string[];
  'x-hasura-user-id': string;
};

/** Pure: derive claims from the user's roles. */
export function computeHasuraClaims(
  uid: string,
  safetrustRoles: readonly string[],
  hotelRole: HotelUserRole | null,
): HasuraClaims {
  const allowed = new Set<string>();
  for (const role of safetrustRoles) {
    const mapped = SAFETRUST_HASURA_ROLE[role];
    if (mapped) allowed.add(mapped);
  }
  if (hotelRole === 'MANAGER') allowed.add(HOTEL_MANAGER_ROLE);
  if (hotelRole === 'STAFF') allowed.add(HOTEL_STAFF_ROLE);
  if (allowed.size === 0) allowed.add(SAFETRUST_HASURA_ROLE.guest);

  const allowedRoles = DEFAULT_ROLE_PRIORITY.filter((r) => allowed.has(r)).concat(
    [...allowed].filter((r) => !DEFAULT_ROLE_PRIORITY.includes(r)),
  );

  return {
    'x-hasura-default-role': allowedRoles[0],
    'x-hasura-allowed-roles': allowedRoles,
    'x-hasura-user-id': uid,
  };
}

const ROLE_STATE = `
  query HasuraRoleState($uid: String!) {
    user_roles(where: { user_id: { _eq: $uid } }) { role_id }
    hotel_users(where: { firebase_uid: { _eq: $uid } }, limit: 1) { role }
  }
`;

const ROLE_NAMES = `
  query RoleNames($ids: [Int!]!) {
    roles(where: { id: { _in: $ids } }) { name }
  }
`;

/** Reads the user's roles from both tenants. */
export async function loadRoleState(uid: string): Promise<{ safetrustRoles: string[]; hotelRole: HotelUserRole | null }> {
  const state = await executeGraphQL<{
    user_roles: Array<{ role_id: number }>;
    hotel_users: Array<{ role: HotelUserRole }>;
  }>(ROLE_STATE, { uid });

  const ids = state.user_roles.map((r) => r.role_id);
  let safetrustRoles: string[] = [];
  if (ids.length > 0) {
    const names = await executeGraphQL<{ roles: Array<{ name: string }> }>(ROLE_NAMES, { ids });
    safetrustRoles = names.roles.map((r) => r.name);
  }
  return { safetrustRoles, hotelRole: state.hotel_users[0]?.role ?? null };
}

/**
 * Recomputes and stores the user's Hasura claims, preserving any other custom
 * claims already on the Firebase user. Returns the claims written.
 */
export async function syncHasuraClaims(uid: string): Promise<HasuraClaims> {
  const { safetrustRoles, hotelRole } = await loadRoleState(uid);
  const claims = computeHasuraClaims(uid, safetrustRoles, hotelRole);

  const auth = getAuth();
  const user = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    [HASURA_CLAIMS_NAMESPACE]: claims,
  });
  return claims;
}
