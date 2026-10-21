import { DEFAULT_ROLE, isUserRole, resolveHighestRole, type UserRole } from './roles';

export async function fetchUserRole(uid: string): Promise<UserRole> {
  if (!uid) {
    console.error('fetchUserRole: empty uid — returning default role');
    return DEFAULT_ROLE;
  }

  const hasuraUrl =
    process.env.HASURA_GRAPHQL_URL ??
    process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL ??
    '';

  if (!hasuraUrl) {
    console.error('fetchUserRole: HASURA_GRAPHQL_URL not set');
    return DEFAULT_ROLE;
  }

  const adminSecret = process.env.HASURA_ADMIN_SECRET ?? '';

  try {
    const response = await fetch(hasuraUrl, {
      method: 'POST',
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

    return resolveHighestRole(
      (json.data?.user_roles ?? []).map((row) => row.role?.name)
    );

  } catch (error) {
    console.error('fetchUserRole: failed to reach Hasura or request failed', error);
    return DEFAULT_ROLE;
  }
}