import type { Request, Response } from 'express';
import { getAuth }                 from 'firebase-admin/auth';
import { executeGraphQL }          from '../../lib/hasura.js';

const POLLAR_VERIFY_URL = 'https://server.api.pollar.xyz/v1/tokens/verify';

const UPSERT_WALLET = `
  mutation UpsertPollarWallet($userId: String!, $address: String!) {
    update_user_wallets(
      where: { user_id: { _eq: $userId }, is_primary: { _eq: true } }
      _set: { is_primary: false }
    ) {
      affected_rows
    }
    insert_user_wallets_one(
      object: {
        user_id:        $userId
        wallet_address: $address
        chain_type:     "STELLAR"
        is_primary:     true
        provider:       "pollar"
      }
      on_conflict: {
        constraint:     unique_wallet_address
        update_columns: [is_primary, provider]
      }
    ) {
      id
      wallet_address
    }
  }
`;

export const activateWalletHandler = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    // ── 1. Verify Firebase token ──────────────────────────────────────────
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Bearer token' });
    }

    if (!process.env.POLLAR_SECRET_KEY) {
      return res.status(500).json({ error: 'Pollar is not configured on this server' });
    }

    const idToken = authHeader.split(' ')[1];

    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired Firebase token' });
    }

    const uid = decodedToken.uid;

    const requestBody = req.body as {
      address?: unknown;
      pollarAccessToken?: unknown;
    } | undefined;
    const address = requestBody?.address;
    const pollarAccessToken = requestBody?.pollarAccessToken;

    if (
      typeof address !== 'string' ||
      !address ||
      typeof pollarAccessToken !== 'string' ||
      !pollarAccessToken
    ) {
      return res.status(400).json({ error: 'A wallet address and Pollar access token are required' });
    }

    // ── 2. Verify the SDK session and its wallet with Pollar ───────────────
    let pollarBody: {
      success?: boolean;
      content?: { wallet?: { address?: string | null } };
    };

    try {
      const pollarRes = await fetch(POLLAR_VERIFY_URL, {
        method:  'POST',
        redirect: 'error',
        headers: {
          'Content-Type':     'application/json',
          'x-pollar-api-key': process.env.POLLAR_SECRET_KEY,
        },
        body: JSON.stringify({ token: pollarAccessToken }),
      });

      if (!pollarRes.ok) {
        console.error(`[activate-wallet] Pollar token verification failed: ${pollarRes.status}`);
        return res.status(pollarRes.status === 401 || pollarRes.status === 403 ? 401 : 502)
          .json({ error: 'Pollar session verification failed' });
      }

      pollarBody = await pollarRes.json() as typeof pollarBody;
    } catch (err) {
      console.error('[activate-wallet] Pollar verification request failed:', err);
      return res.status(502).json({ error: 'Pollar session verification failed' });
    }

    if (!pollarBody.success || pollarBody.content?.wallet?.address !== address) {
      return res.status(403).json({ error: 'Wallet address does not match the authenticated Pollar wallet' });
    }

    // ── 3. Persist only the verified wallet address ────────────────────────
    const walletData = await executeGraphQL<{
      update_user_wallets: { affected_rows: number };
      insert_user_wallets_one: { id: string; wallet_address: string };
    }>(UPSERT_WALLET, { userId: uid, address });

    console.log(`[activate-wallet] ✅ wallet activated — uid: ${uid}, address: ${address.slice(0, 8)}...`);

    return res.status(200).json({
      address,
      walletId: walletData.insert_user_wallets_one.id,
    });

  } catch (err) {
    console.error('[activate-wallet] ❌ error:', err);
    return res.status(500).json({ error: 'Database sync failed' });
  }
};
