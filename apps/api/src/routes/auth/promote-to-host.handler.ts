import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { hasuraRequest } from '../../services/hasura.js';

export const promoteToHostHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  const { uid } = req.user;

  try {
    // Get host role id
    const rolesData = await hasuraRequest<{
      roles: Array<{ id: number; name: string }>;
    }>(
      `query GetHostRole {
        roles(where: { name: { _eq: "host" } }, limit: 1) {
          id name
        }
      }`
    );

    const hostRoleId = rolesData.roles?.[0]?.id;

    if (!hostRoleId) {
      return res.status(500).json({ error: 'host role not found in roles table' });
    }

    // Insert host role — ON CONFLICT DO NOTHING if already host
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

    console.log(`[auth/promote-to-host] ✅ user ${uid} promoted to host`);
    return res.status(200).json({ role: 'host', promoted: true });

  } catch (error) {
    console.error('[auth/promote-to-host] ❌ error:', error);
    return res.status(500).json({ error: 'Failed to promote user to host' });
  }
};
