import { DEFAULT_ROLE, resolveHighestRole, type UserRole } from './roles';

const HASURA_URL =
  process.env.HASURA_GRAPHQL_URL ?? process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL ?? '';

// Every assignment is fetched (a user holds at most a handful) so the caller
// can resolve by precedence instead of trusting row order.
const GET_USER_ROLES = `
  query GetUserRoles($uid: String!) {
    user_roles(where: { user_id: { _eq: $uid } }) {
      role { name }
    }
  }
`;

/**
 * Resolves a user's effective role from Hasura.
 *
 * Fails open to 'guest' — a role lookup outage must never lock a user out, and
 * 'guest' is the least-privileged answer, so failing open cannot grant access.
 */
export async function fetchUserRole(uid: string): Promise<UserRole> {
  if (!uid) return DEFAULT_ROLE;

  try {
    const response = await fetch(HASURA_URL, {
      method: 'POST',
      // Middleware runs on every dashboard navigation — bound the wait so a
      // slow Hasura degrades to 'guest' instead of hanging the request.
      signal: AbortSignal.timeout(3000),
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET ?? '',
      },
      body: JSON.stringify({
        query: GET_USER_ROLES,
        variables: { uid },
      }),
    });

    if (!response.ok) {
      console.error(`fetchUserRole: Hasura returned non-ok HTTP status ${response.status}`);
      return DEFAULT_ROLE;
    }

    const json = (await response.json()) as {
      data?: { user_roles?: { role?: { name?: string } }[] };
      errors?: { message: string }[];
    };

    if (json.errors?.length) {
      console.error('fetchUserRole: Hasura returned GraphQL errors', json.errors);
      return DEFAULT_ROLE;
    }

    return resolveHighestRole((json.data?.user_roles ?? []).map((row) => row.role?.name));
  } catch (error) {
    console.error('fetchUserRole: failed to reach Hasura or request failed', error);
    return DEFAULT_ROLE;
  }
}
