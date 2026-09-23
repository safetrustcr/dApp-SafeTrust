import type { Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';

import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { hasuraRequest } from '../../services/hasura.js';

const ASSIGNABLE_ROLES = ['guest', 'host', 'admin'] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

type CreateUserBody = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: AssignableRole;
};

type ChangeRoleBody = { role?: AssignableRole };

function isAssignableRole(value: unknown): value is AssignableRole {
  return typeof value === 'string' && ASSIGNABLE_ROLES.includes(value as AssignableRole);
}

async function roleIdFor(role: AssignableRole): Promise<number> {
  const data = await hasuraRequest<{ roles: Array<{ id: number }> }>(
    `query GetRoleId($name: String!) {
      roles(where: { name: { _eq: $name } }, limit: 1) { id }
    }`,
    { name: role },
  );
  const roleId = data.roles[0]?.id;
  if (roleId === undefined) throw new Error(`Role '${role}' is not configured`);
  return roleId;
}

export async function listUsersHandler(
  _req: Request,
  res: Response,
): Promise<Response> {
  try {
    const data = await hasuraRequest<{
      users: Array<Record<string, unknown>>;
    }>(
      `query ListManagedUsers {
        users(order_by: { last_seen: desc }) {
          id email first_name last_name phone_number country_code location last_seen
          user_roles { role { name } }
        }
      }`,
    );
    return res.json({ users: data.users });
  } catch (error) {
    console.error('[admin/users] Failed to list users:', error);
    return res.status(500).json({ error: 'Unable to load users' });
  }
}

export async function createManagedUserHandler(
  req: AuthenticatedRequest & { body: CreateUserBody },
  res: Response,
): Promise<Response> {
  const { email, password, firstName = '', lastName = '', role } = req.body;
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must contain at least 6 characters' });
  }
  if (!isAssignableRole(role)) {
    return res.status(400).json({ error: 'Role must be guest, host, or admin' });
  }

  let firebaseUid: string | null = null;
  let databaseUserCreated = false;
  try {
    const displayName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
    const firebaseUser = await getAuth().createUser({
      email: normalizedEmail,
      password,
      displayName: displayName || undefined,
    });
    firebaseUid = firebaseUser.uid;

    const roleId = await roleIdFor(role);
    await hasuraRequest(
      `mutation CreateManagedUser($user: users_insert_input!, $userId: String!, $roleId: Int!) {
        insert_users_one(object: $user) { id }
        insert_user_roles_one(object: { user_id: $userId, role_id: $roleId }) { id }
      }`,
      {
        user: {
          id: firebaseUid,
          email: normalizedEmail,
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
        },
        userId: firebaseUid,
        roleId,
      },
    );
    databaseUserCreated = true;
    await getAuth().setCustomUserClaims(firebaseUid, { safetrustRole: role });

    return res.status(201).json({
      user: { id: firebaseUid, email: normalizedEmail, first_name: firstName, last_name: lastName, role },
    });
  } catch (error) {
    if (firebaseUid && databaseUserCreated) {
      await hasuraRequest(
        `mutation RemoveFailedManagedUser($userId: String!) {
          delete_users_by_pk(id: $userId) { id }
        }`,
        { userId: firebaseUid },
      ).catch(() => undefined);
    }
    if (firebaseUid) {
      await getAuth().deleteUser(firebaseUid).catch(() => undefined);
    }
    console.error('[admin/users] Failed to create user:', error);
    return res.status(500).json({ error: 'Unable to create user' });
  }
}

export async function changeUserRoleHandler(
  req: AuthenticatedRequest & Request<{ userId: string }, unknown, ChangeRoleBody>,
  res: Response,
): Promise<Response> {
  const { userId } = req.params;
  const { role } = req.body;

  if (!isAssignableRole(role)) {
    return res.status(400).json({ error: 'Role must be guest, host, or admin' });
  }
  if (userId === req.user.uid && role !== 'admin') {
    return res.status(400).json({ error: 'Administrators cannot remove their own admin role' });
  }

  try {
    await getAuth().getUser(userId);
    const existingUser = await hasuraRequest<{
      users_by_pk: { id: string; user_roles: Array<{ role: { name: string } | null }> } | null;
    }>(
      `query FindManagedUser($userId: String!) {
        users_by_pk(id: $userId) { id user_roles { role { name } } }
      }`,
      { userId },
    );
    if (!existingUser.users_by_pk) {
      return res.status(404).json({ error: 'User not found' });
    }
    const targetIsAdmin = existingUser.users_by_pk.user_roles.some(
      (assignment) => assignment.role?.name === 'admin',
    );
    if (targetIsAdmin && role !== 'admin') {
      const administrators = await hasuraRequest<{
        user_roles_aggregate: { aggregate: { count: number } | null };
      }>(
        `query CountAdministrators {
          user_roles_aggregate(where: { role: { name: { _eq: "admin" } } }) {
            aggregate { count }
          }
        }`,
      );
      if ((administrators.user_roles_aggregate.aggregate?.count ?? 0) <= 1) {
        return res.status(400).json({ error: 'At least one administrator must remain assigned' });
      }
    }
    const roleId = await roleIdFor(role);
    await hasuraRequest(
      `mutation ReplaceUserRole($userId: String!, $roleId: Int!) {
        delete_user_roles(where: { user_id: { _eq: $userId } }) { affected_rows }
        insert_user_roles_one(object: { user_id: $userId, role_id: $roleId }) { id }
      }`,
      { userId, roleId },
    );
    const firebaseUser = await getAuth().getUser(userId);
    await getAuth().setCustomUserClaims(userId, {
      ...firebaseUser.customClaims,
      safetrustRole: role,
    });
    return res.json({ userId, role });
  } catch (error) {
    console.error('[admin/users] Failed to change role:', error);
    return res.status(500).json({ error: 'Unable to change user role' });
  }
}
