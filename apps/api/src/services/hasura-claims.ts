export type AssignableRole = 'guest' | 'host' | 'admin' | 'MANAGER' | 'STAFF';

const HASURA_ROLE: Record<AssignableRole, string> = {
  guest: 'tenant',
  host: 'landlord',
  admin: 'platform_admin',
  MANAGER: 'MANAGER',
  STAFF: 'STAFF',
};

export function hasuraClaimsFor(uid: string, role: AssignableRole) {
  const hasuraRole = HASURA_ROLE[role];
  return {
    'x-hasura-default-role': hasuraRole,
    'x-hasura-allowed-roles': [hasuraRole],
    'x-hasura-user-id': uid,
  };
}

export async function setHasuraUserClaims(
  uid: string,
  role: AssignableRole,
  existingClaims: Record<string, unknown> = {},
): Promise<void> {
  const { getAuth } = await import('firebase-admin/auth');
  await getAuth().setCustomUserClaims(uid, {
    ...existingClaims,
    safetrustRole: role,
    hasura: hasuraClaimsFor(uid, role),
  });
}