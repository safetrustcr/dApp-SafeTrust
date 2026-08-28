import { DEFAULT_ROLE, isUserRole, resolveHighestRole, type UserRole } from './roles';

// NOTE: role-utils.ts uses 'hotel' for this role;
// Hasura returns 'host' per issue #287 — middleware uses 'host'.

/**
 * Resolves a user's effective role from Hasura.
 *
 * Fetches ALL role assignments (no limit) so resolveHighestRole can pick the
 * most permissive one. A user promoted from guest → host holds two rows; with
 * limit:1 the wrong row could be returned depending on row order.
 *
 * Fails open to 'guest' — a role lookup outage must never lock a user out,
 * and 'guest' is least-privileged so failing open cannot grant extra access.
 */
export async function fetchUserRole(uid: string): Promise<UserRole> {
  if (!uid) {
    console.error('fetchUserRole: empty uid — returning default role');
    return DEFAULT_ROLE;
  }

  const hasuraUrl =
    process.env.HASURA_GRAPHQL_URL ??
    process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL ??
    '';
  const adminSecret = process.env.HASURA_ADMIN_SECRET ?? '';

  if (!hasuraUrl) {
    console.error('fetchUserRole: HASURA_GRAPHQL_URL not set');
    return DEFAULT_ROLE;
  }

  try {
    const response = await fetch(hasuraUrl, {
      method: 'POST',
      // Middleware runs on every dashboard navigation — bound the wait so a
      // slow Hasura degrades to 'guest' instead of hanging the request.
      signal: AbortSignal.timeout(3000),
      headers: {
        'Content-Type':          'application/json',
        'x-hasura-admin-secret': adminSecret,
      },
      body: JSON.stringify({
        query: `
          query GetUserRoles($uid: String!) {
            user_roles(where: { user_id: { _eq: $uid } }) {
              role { name }
            }
          }
        `,
        // No limit — fetch all assignments so resolveHighestRole works correctly.
        // A user promoted from guest → host holds two rows; limit:1 may return
        // the wrong one depending on insertion order.
        variables: { uid },
      }),
    });

    if (!response.ok) {
      console.error('fetchUserRole: non-ok response', response.status);
      return DEFAULT_ROLE;
    }

    const json = (await response.json()) as {
      data?: { user_roles?: { role?: { name?: string } }[] };
      errors?: { message: string }[];
    };

    if (json.errors?.length) {
      console.error('fetchUserRole: Hasura errors', json.errors);
      return DEFAULT_ROLE;
    }

    return resolveHighestRole(
      (json.data?.user_roles ?? []).map((row) => row.role?.name)
    );

  } catch (error) {
    console.error('fetchUserRole: failed to reach Hasura or request failed', error);
    return DEFAULT_ROLE;
  }
}