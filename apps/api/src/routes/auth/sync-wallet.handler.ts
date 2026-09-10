import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { hasuraRequest } from '../../services/hasura.js';

type SyncWalletBody = {
  walletAddress: string;
  chainType: 'STELLAR';
  isPrimary?: boolean;
  provider?: 'freighter' | 'pollar' | 'albedo' | string;
};

type SyncWalletResponse = {
  wallet: {
    id: string;
    wallet_address: string;
    chain_type: string;
    is_primary: boolean;
    provider: string | null;
  };
};

/**
 * POST /api/auth/sync-wallet
 *
 * Upserts a Stellar wallet address for the authenticated user.
 * Called after Freighter connects or after Pollar activates a wallet.
 *
 * Idempotent — uses ON CONFLICT on wallet_address to update is_primary.
 * When isPrimary is true, the same Hasura mutation first demotes the user's
 * current primary wallet so the change is atomic.
 */
export const syncWalletHandler = async (
  req: AuthenticatedRequest & { body: SyncWalletBody },
  res: Response<SyncWalletResponse | { error: string }>
): Promise<Response> => {
  const { uid } = req.user;
  const { walletAddress, chainType, isPrimary = false, provider } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Missing required field: walletAddress' });
  }

  if (chainType !== 'STELLAR') {
    return res.status(400).json({ error: 'chainType must be STELLAR' });
  }

  // Basic Stellar address validation (G-address, 56 chars)
  if (!walletAddress.startsWith('G') || walletAddress.length !== 56) {
    return res.status(400).json({
      error: 'Invalid Stellar wallet address — must be a 56-character G-address',
    });
  }

  try {
    const data = await hasuraRequest<{
      insert_user_wallets_one: {
        id: string;
        wallet_address: string;
        chain_type: string;
        is_primary: boolean;
        provider: string | null;
      };
    }>(
      `mutation SyncWallet(
        $userId: String!
        $walletAddress: String!
        $chainType: String!
        $isPrimary: Boolean!
        $provider: String
      ) {
        update_user_wallets(
          where: { user_id: { _eq: $userId }, is_primary: { _eq: true } }
          _set: { is_primary: false }
        ) @include(if: $isPrimary) {
          affected_rows
        }
        insert_user_wallets_one(
          object: {
            user_id: $userId
            wallet_address: $walletAddress
            chain_type: $chainType
            is_primary: $isPrimary
            provider: $provider
          }
          on_conflict: {
            constraint: unique_wallet_address
            update_columns: [is_primary, provider]
          }
        ) {
          id
          wallet_address
          chain_type
          is_primary
          provider
        }
      }`,
      { userId: uid, walletAddress, chainType, isPrimary, provider: provider ?? null }
    );

    const wallet = data.insert_user_wallets_one;

    console.log(
      `[auth/sync-wallet] ✅ wallet synced — userId: ${uid}, ` +
      `address: ${walletAddress.slice(0, 8)}..., provider: ${provider ?? 'unknown'}`
    );

    return res.status(200).json({ wallet });
  } catch (error) {
    console.error('[auth/sync-wallet] ❌ error:', error);
    return res.status(500).json({ error: 'Failed to sync wallet' });
  }
};
