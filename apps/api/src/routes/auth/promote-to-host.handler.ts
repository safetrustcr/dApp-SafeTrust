import type { Response } from 'express';

import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { hasuraRequest } from '../../services/hasura.js';

const GET_ROLE_ID = `
  query GetRoleId($name: String!) {
    roles(where: { name: { _eq: $name } }, limit: 1) {
      id
    }
  }
`;

// update_columns: [] makes this a no-op when the assignment already exists, so
// promoting twice is safe and still returns the row.
const PROMOTE_TO_HOST = `
  mutation PromoteToHost($userId: String!, $roleId: Int!) {
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

type GetRoleIdResult = { roles: { id: number }[] };
type PromoteResult = { insert_user_roles_one: { id: string } | null };

/**
 * POST /api/auth/promote-to-host
 *
 * Grants the caller the 'host' role. The guest assignment is left in place —
 * roles are additive and the frontend resolves the highest-privilege one.
 */
export const promoteToHostHandler = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const { uid } = req.user;

  try {
    // Looked up by name rather than hardcoding an id, so the handler does not
    // break if the roles table is seeded in a different order.
    const { roles } = await hasuraRequest<GetRoleIdResult>(GET_ROLE_ID, { name: 'host' });
    const roleId = roles[0]?.id;

    if (roleId === undefined) {
      console.error('[promote-to-host] host role missing from roles table');
      return res.status(500).json({ error: 'Host role is not configured' });
    }

    await hasuraRequest<PromoteResult>(PROMOTE_TO_HOST, { userId: uid, roleId });

    return res.status(200).json({ role: 'host', promoted: true });
  } catch (error) {
    console.error('[promote-to-host] error:', error);
    return res.status(500).json({ error: 'Failed to promote user to host' });
  }
};
