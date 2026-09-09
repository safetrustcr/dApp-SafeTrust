const POLLAR_ACTIVATE_URL =
  process.env.POLLAR_ACTIVATE_URL || "https://sdk.api.pollar.xyz/v2/wallet/activate";

function decodeUid(token: string) {
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );
  return payload.user_id || payload.sub;
}

export const activateWalletHandler = async (req: { body?: {}; headers: any; }, res: { _status?: null; _body?: undefined; status: any; json?: (payload: any) => { _status: null; _body: undefined; status(code: any): /*elided*/ any; json(payload: any): /*elided*/ any; }; }) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing token" });
    }

    const pollarSecretKey = process.env.POLLAR_SECRET_KEY;

    if (!pollarSecretKey) {
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
        Authorization: `Bearer ${pollarSecretKey}`,
        "x-pollar-api-key": pollarSecretKey,
      },
      body: JSON.stringify({ userId: uid }),
    });

    if (!pollarRes.ok) {
      const details = await pollarRes.text();
      console.error("[activate-wallet] Pollar error:", pollarRes.status, details);
      return res.status(502).json({ error: "Pollar activation failed" });
    }

    const pollarBody = (await pollarRes.json()) as { address?: string };
    const address = pollarBody.address;

    if (!address) {
      return res.status(502).json({ error: "Pollar returned no address" });
    }

    const hasuraGraphqlUrl = process.env.HASURA_GRAPHQL_URL;
    const hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET;

    if (!hasuraGraphqlUrl) {
      return res.status(500).json({ error: "Hasura is not configured" });
    }

    if (!hasuraAdminSecret) {
      return res.status(500).json({ error: "Hasura admin secret is not configured" });
    }

    const hasuraHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": hasuraAdminSecret,
    };

    const hasuraRes = await fetch(hasuraGraphqlUrl, {
      method: "POST",
      headers: hasuraHeaders,
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

    const data = (await hasuraRes.json()) as {
      errors?: unknown;
      [key: string]: unknown;
    };

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
