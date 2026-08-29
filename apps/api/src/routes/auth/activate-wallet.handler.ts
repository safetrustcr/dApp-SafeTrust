import type { Request, Response } from 'express';
import { getAuth }                 from 'firebase-admin/auth';
import { executeGraphQL }          from '../../lib/hasura.js';

const DEFAULT_POLLAR_ACTIVATE_URL = 'https://sdk.api.pollar.xyz/v2/wallet/activate';

const UPSERT_WALLET = `
  mutation UpsertPollarWallet($userId: String!, $address: String!) {
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

    const idToken      = authHeader.split(' ')[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const uid          = decodedToken.uid;

    // ── 2. Activate Pollar embedded wallet ────────────────────────────────
    const pollarActivateUrl = process.env.POLLAR_ACTIVATE_URL ?? DEFAULT_POLLAR_ACTIVATE_URL;
    const pollarRes = await fetch(pollarActivateUrl, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'Authorization':   `Bearer ${process.env.POLLAR_SECRET_KEY}`,
        'x-pollar-api-key': process.env.POLLAR_SECRET_KEY,
      },
      body: JSON.stringify({ userId: uid }),
    });

    if (!pollarRes.ok) {
      const details = await pollarRes.text();
      console.error('[activate-wallet] Pollar error:', pollarRes.status, details);
      return res.status(502).json({ error: 'Pollar wallet activation failed' });
    }

    const pollarBody = (await pollarRes.json()) as { address?: string };
    const address    = pollarBody.address;

    if (!address) {
      console.error('[activate-wallet] Pollar returned no address for uid:', uid);
      return res.status(502).json({ error: 'Pollar returned no wallet address' });
    }

    // ── 3. Persist wallet address to user_wallets ─────────────────────────
    const walletData = await executeGraphQL<{
      insert_user_wallets_one: { id: string; wallet_address: string };
    }>(UPSERT_WALLET, { userId: uid, address });

    console.log(`[activate-wallet] ✅ wallet activated for ${uid}: ${address}`);

    return res.status(200).json({
      address,
      walletId: walletData.insert_user_wallets_one.id,
    });

  } catch (err) {
    console.error('[activate-wallet] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
