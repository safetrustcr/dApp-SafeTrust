import type { Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { executeGraphQL } from '../../lib/hasura.js';

interface SyncUserBody {
  phone_number?: string;
  country_code?: string;
  location?: string;
  dev_role?: 'guest' | 'host';
}

const UPSERT_USER = `
  mutation UpsertUser(
    $id: String!,
    $email: String!,
    $first_name: String!,
    $last_name: String!,
    $phone_number: String!,
    $country_code: String!,
    $location: String!
  ) {
    insert_users_one(
      object: {
        id: $id
        email: $email
        first_name: $first_name
        last_name: $last_name
        phone_number: $phone_number
        country_code: $country_code
        location: $location
      }
      on_conflict: {
        constraint: users_email_unique
        update_columns: [id, first_name, last_name, phone_number, country_code, location, last_seen]
      }
    ) {
      id
      email
    }
  }
`;

const GET_ROLE_ID = `
  query GetRoleId($roleName: String!) {
    roles(where: { name: { _eq: $roleName } }, limit: 1) {
      id
    }
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
    ) {
      id
    }
  }
`;

export const syncUserHandler = async (
  req: Request<unknown, unknown, SyncUserBody>,
  res: Response,
): Promise<Response> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Bearer token' });
    }

    const idToken = authHeader.split(' ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);

    const uid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      return res.status(400).json({ error: 'Token must contain a valid email' });
    }

    const name = decodedToken.name ?? '';
    const [firstName = '', ...rest] = name.split(' ');
    const lastName = rest.join(' ');

    const { phone_number, country_code, location, dev_role } = req.body;

    const upsertData = await executeGraphQL<{ insert_users_one: { id: string; email: string } }>(
      UPSERT_USER,
      {
        id: uid,
        email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phone_number ?? '',
        country_code: country_code ?? '',
        location: location ?? '',
      },
    );

    const user = upsertData.insert_users_one;

    if (process.env.NODE_ENV !== 'production' && dev_role) {
      const validDevRoles = ['guest', 'host'] as const;

      if (validDevRoles.includes(dev_role)) {
        const roleData = await executeGraphQL<{ roles: { id: number }[] }>(GET_ROLE_ID, {
          roleName: dev_role,
        });

        const roleId = roleData.roles[0]?.id;

        if (roleId !== undefined) {
          await executeGraphQL(ASSIGN_ROLE, { userId: uid, roleId });
          console.log(`[sync-user] [DEV] role '${dev_role}' → ${uid}`);
        } else {
          console.warn(`[sync-user] [DEV] role '${dev_role}' not in DB — run 07_roles_seed.sql`);
        }
      }
    }

    return res.status(200).json({ success: true, user });
  } catch (err) {
    console.error('[sync-user] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
