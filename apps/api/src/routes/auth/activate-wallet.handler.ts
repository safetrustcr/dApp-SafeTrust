import type { Request, Response } from 'express';
import { getAuth }                 from 'firebase-admin/auth';
import { executeGraphQL }          from '../../lib/hasura.js';

const rawUrl = process.env.POLLAR_ACTIVATE_URL ?? 'https://sdk.api.pollar.xyz/v2/wallet/activate';
const pollarUrlObj = new URL(rawUrl);

if (pollarUrlObj.protocol !== 'https:') {
  throw new Error('POLLAR_ACTIVATE_URL must use HTTPS');
}

const POLLAR_ACTIVATE_URL = pollarUrlObj.toString();

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

    // ── 2. Activate Pollar embedded wallet ────────────────────────────────
    const pollarRes = await fetch(POLLAR_ACTIVATE_URL, {
      method:  'POST',
      redirect: 'error',
      headers: {
        'Content-Type':     'application/json',
        'Authorization':    `Bearer ${process.env.POLLAR_SECRET_KEY}`,
        'x-pollar-api-key': process.env.POLLAR_SECRET_KEY,
      },
      body: JSON.stringify({ userId: uid }),
    });

    if (!pollarRes.ok) {
      const details = await pollarRes.text();
      console.error(`[activate-wallet] Pollar error: ${pollarRes.status} ${details}`);
      return res.status(502).json({ error: 'Pollar activation failed' });
    }

    const pollarBody = (await pollarRes.json()) as { address?: string };
    const address    = pollarBody.address;

    if (!address) {
      console.error('[activate-wallet] Pollar returned no address for uid:', uid);
      return res.status(502).json({ error: 'Pollar returned no wallet address' });
    }

    // ── 3. Persist wallet address to user_wallets ─────────────────────────
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
