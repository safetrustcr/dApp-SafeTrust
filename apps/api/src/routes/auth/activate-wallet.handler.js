const POLLAR_ACTIVATE_URL = "https://api.pollar.xyz/v1/wallets/activate";

function decodeUid(token) {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );
  return payload.user_id || payload.sub;
}

export const activateWalletHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing token" });
    }

    if (!process.env.POLLAR_SECRET_KEY) {
      return res.status(500).json({ error: "Pollar is not configured" });
    }

    const token = authHeader.split(" ")[1];
    let uid;

    try {
      uid = decodeUid(token);
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }

    if (!uid) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const pollarRes = await fetch(POLLAR_ACTIVATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.POLLAR_SECRET_KEY}`,
      },
      body: JSON.stringify({ userId: uid }),
    });

    if (!pollarRes.ok) {
      const details = await pollarRes.text();
      console.error("[activate-wallet] Pollar error:", pollarRes.status, details);
      return res.status(502).json({ error: "Pollar activation failed" });
    }

    const pollarBody = await pollarRes.json();
    const address = pollarBody.address;

    if (!address) {
      return res.status(502).json({ error: "Pollar returned no address" });
    }

    const hasuraRes = await fetch(process.env.HASURA_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": process.env.HASURA_ADMIN_SECRET,
      },
      body: JSON.stringify({
        query: `
          mutation UpsertPollarWallet($userId: String!, $address: String!) {
            insert_user_wallets_one(
              object: {
                user_id: $userId
                wallet_address: $address
                chain_type: "STELLAR"
                is_primary: true
                provider: "pollar"
              }
              on_conflict: {
                constraint: unique_wallet_address
                update_columns: [is_primary, provider]
              }
            ) {
              id
              wallet_address
            }
          }
        `,
        variables: { userId: uid, address },
      }),
    });

    const data = await hasuraRes.json();

    if (data.errors) {
      console.error("[activate-wallet] Hasura error:", data.errors);
      return res.status(500).json({ error: "Database sync failed", details: data.errors });
    }

    return res.status(200).json({ address });
  } catch (err) {
    console.error("[activate-wallet] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
