export const syncUserHandler = async (req, res) => {
  try {
    const { phone_number, country_code, location, dev_role } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing token" });
    }

    const token = authHeader.split(" ")[1];

    // Decode Firebase JWT to get uid and email
    // TODO: verify signature with firebase-admin SDK
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    );

    const uid   = payload.user_id || payload.sub;
    const email = payload.email;
    const name  = payload.name || "";
    const [firstName, ...rest] = name.split(" ");
    const lastName = rest.join(" ") || "";

    // ── Step 1: upsert user ────────────────────────────────────────────────
    const hasuraRes = await fetch(process.env.HASURA_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type":          "application/json",
        "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
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
        `,
        variables: {
          id:           uid,
          email,
          first_name:   firstName,
          last_name:    lastName,
          phone_number: phone_number || "",
          country_code: country_code || "",
          location:     location     || "",
        },
      }),
    });

    const data = await hasuraRes.json();

    if (data.errors) {
      console.error("[sync-user] Hasura error:", data.errors);
      return res.status(500).json({ error: "Database sync failed", details: data.errors });
    }

    const user = data.data.insert_users_one;

    // ── Step 2 (dev only): assign role if dev_role was provided ───────────
    // This block is completely removed in production — never executes.
    // Allows contributors to test guest/host flows without calling
    // promote-to-host after every fresh DB reset.
    if (process.env.NODE_ENV !== "production" && dev_role) {
      const validDevRoles = ["guest", "host"];

      if (validDevRoles.includes(dev_role)) {
        const roleRes = await fetch(process.env.HASURA_GRAPHQL_URL, {
          method: "POST",
          headers: {
            "Content-Type":          "application/json",
            "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET,
          },
          body: JSON.stringify({
            query: `
              mutation AssignDevRole($userId: String!, $roleName: String!) {
                role: roles(where: { name: { _eq: $roleName } }, limit: 1) {
                  id
                }
                insert_user_roles_one(
                  object: {
                    user_id: $userId
                    role_id: 0
                  }
                ) {
                  id
                }
              }
            `,
          }),
        });

        // Use two separate queries — simpler and avoids nested mutation issues
        const roleQueryRes = await fetch(process.env.HASURA_GRAPHQL_URL, {
          method: "POST",
          headers: {
            "Content-Type":          "application/json",
            "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET,
          },
          body: JSON.stringify({
            query: `
              query GetRoleId($roleName: String!) {
                roles(where: { name: { _eq: $roleName } }, limit: 1) {
                  id
                }
              }
            `,
            variables: { roleName: dev_role },
          }),
        });

        const roleData = await roleQueryRes.json();
        const roleId   = roleData.data?.roles?.[0]?.id;

        if (roleId) {
          await fetch(process.env.HASURA_GRAPHQL_URL, {
            method: "POST",
            headers: {
              "Content-Type":          "application/json",
              "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET,
            },
            body: JSON.stringify({
              query: `
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
              `,
              variables: { userId: uid, roleId },
            }),
          });
          console.log(`[sync-user] [DEV] assigned role '${dev_role}' to ${uid}`);
        } else {
          console.warn(`[sync-user] [DEV] role '${dev_role}' not found in roles table — was 07_roles_seed.sql applied?`);
        }
      }
    }

    return res.status(200).json({ success: true, user });

  } catch (err) {
    console.error("[sync-user] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};