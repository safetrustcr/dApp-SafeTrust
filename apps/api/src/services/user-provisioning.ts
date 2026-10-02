import { executeGraphQL } from '../lib/hasura.js';

export const SAFE_TRUST_ROLES = ['guest', 'host', 'admin'] as const;
export type SafeTrustRole = (typeof SAFE_TRUST_ROLES)[number];

export type UserProfileInput = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  countryCode?: string;
  location?: string;
};

const UPSERT_USER = `
  mutation UpsertUser(
    $id: String!, $email: String!, $first_name: String!, $last_name: String!,
    $phone_number: String!, $country_code: String!, $location: String!
  ) {
    insert_users_one(
      object: {
        id: $id, email: $email, first_name: $first_name, last_name: $last_name,
        phone_number: $phone_number, country_code: $country_code, location: $location
      }
      on_conflict: {
        constraint: users_email_unique
        update_columns: [id, first_name, last_name, phone_number, country_code, location, last_seen]
      }
    ) { id email }
  }
`;

const GET_ROLE_ID = `
  query GetRoleId($roleName: String!) {
    roles(where: { name: { _eq: $roleName } }, limit: 1) { id }
  }
`;

const ASSIGN_ROLE = `
  mutation AssignRole($userId: String!, $roleId: Int!) {
    insert_user_roles_one(
      object: { user_id: $userId, role_id: $roleId }
      on_conflict: {
        constraint: user_roles_user_id_role_id_key
        update_columns: []
      }
    ) { id }
  }
`;

/**
 * Writes the profile record for a Firebase identity. This is intentionally a
 * server-only function: the caller chooses the authenticated Firebase UID,
 * never an arbitrary browser-provided UID.
 */
export async function syncUserProfile(input: UserProfileInput): Promise<{ id: string; email: string }> {
  const data = await executeGraphQL<{ insert_users_one: { id: string; email: string } }>(
    UPSERT_USER,
    {
      id: input.id,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      phone_number: input.phoneNumber ?? '',
      country_code: input.countryCode ?? '',
      location: input.location ?? '',
    },
  );
  return data.insert_users_one;
}

/**
 * Adds a role without removing any existing assignments. That makes seeding
 * idempotent and lets normal registration safely establish only guest access.
 */
export async function ensureUserRole(userId: string, role: SafeTrustRole): Promise<void> {
  const roleData = await executeGraphQL<{ roles: Array<{ id: number }> }>(
    GET_ROLE_ID,
    { roleName: role },
  );
  const roleId = roleData.roles[0]?.id;
  if (roleId === undefined) {
    throw new Error(`Role '${role}' is not configured. Run the SafeTrust database seeds.`);
  }
  await executeGraphQL(ASSIGN_ROLE, { userId, roleId });
}
