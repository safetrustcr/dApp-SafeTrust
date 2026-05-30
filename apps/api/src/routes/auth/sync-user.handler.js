export const syncUserHandler = async (req, res) => {
  try {
    const { phone_number, country_code, location } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing token" });
    }

    const token = authHeader.split(" ")[1];

    // Decode Firebase JWT to get uid and email (without verifying — add firebase-admin later)
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    );

    const uid = payload.user_id || payload.sub;
    const email = payload.email;
    const name = payload.name || "";
    const [firstName, ...rest] = name.split(" ");
    const lastName = rest.join(" ") || "";

    // Upsert user into Hasura PostgreSQL
    const hasuraRes = await fetch(process.env.HASURA_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
                constraint: users_pkey
                update_columns: [phone_number, country_code, location]
              }
            ) {
              id
              email
            }
          }
        `,
        variables: {
          id: uid,
          email,
          first_name: firstName,
          last_name: lastName,
          phone_number: phone_number || "",
          country_code: country_code || "",
          location: location || "",
        },
      }),
    });

    const data = await hasuraRes.json();

    if (data.errors) {
      console.error("[sync-user] Hasura error:", data.errors);
      return res.status(500).json({ error: "Database sync failed", details: data.errors });
    }

    return res.status(200).json({ success: true, user: data.data.insert_users_one });
  } catch (err) {
    console.error("[sync-user] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};