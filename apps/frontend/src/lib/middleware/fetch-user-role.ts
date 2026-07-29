// NOTE: role-utils.ts uses 'hotel' for this role; Hasura returns 'host' per issue #287 — middleware uses 'host'.
export async function fetchUserRole(uid: string): Promise<string> {
  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL ?? '',
      {
        method: 'POST',
        signal: AbortSignal.timeout(3000),
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET ?? '',
        },
        body: JSON.stringify({
          query: `
            query GetUserRole($uid: String!) {
              user_roles(where: { user_id: { _eq: $uid } }, limit: 1) {
                role { name }
              }
            }
          `,
          variables: { uid },
        }),
      },
    );

    if (!response.ok) {
      console.error('fetchUserRole: non-ok response', response.status);
      return 'guest';
    }

    const json = (await response.json()) as {
      data?: { user_roles?: { role?: { name?: string } }[] };
      errors?: { message: string }[];
    };

    if (json.errors?.length) {
      console.error('fetchUserRole: Hasura errors', json.errors);
      return 'guest';
    }

    return json.data?.user_roles?.[0]?.role?.name ?? 'guest';
  } catch (error) {
    console.error('fetchUserRole: error', error);
    return 'guest';
  }
}