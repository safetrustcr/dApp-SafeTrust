import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { hasuraRequest } from '../../services/hasura.js';

export const promoteToHostHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const { uid } = req.user;

  try {
    // Step 1: Look up host role id — pass { name: 'host' } as variables
    const rolesData = await hasuraRequest<{
      roles: Array<{ id: number; name: string }>;
    }>(
      `query GetHostRole($name: String!) {
        roles(where: { name: { _eq: $name } }, limit: 1) {
          id
          name
        }
      }`,
      { name: 'host' }
    );

    const hostRoleId = rolesData.roles?.[0]?.id;

    if (!hostRoleId) {
      console.error('[auth/promote-to-host] ❌ host role not found in roles table');
      return res.status(500).json({ error: 'Host role is not configured' });
    }

    // Step 2: Insert host role — ON CONFLICT DO NOTHING (idempotent)
    // Pass { userId, roleId } — camelCase matches test assertion
    await hasuraRequest(
      `mutation PromoteToHost($userId: String!, $roleId: Int!) {
        insert_user_roles_one(
          object: { user_id: $userId, role_id: $roleId }
          on_conflict: {
            constraint: user_roles_user_id_role_id_key
            update_columns: []
          }
        ) { id }
      }`,
      { userId: uid, roleId: hostRoleId }
    );

    console.log(`[auth/promote-to-host] ✅ user ${uid} promoted to host (roleId: ${hostRoleId})`);
    return res.status(200).json({ role: 'host', promoted: true });

  } catch (error) {
    console.error('[auth/promote-to-host] ❌ error:', error);
    return res.status(500).json({ error: 'Failed to promote user to host' });
  }
};