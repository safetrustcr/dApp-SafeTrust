import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { syncWalletHandler } from './sync-wallet.handler.js';

const router: Router = Router();

/**
 * POST /api/auth/sync-wallet
 *
 * Upserts a Stellar wallet address for the authenticated user.
 * Called by:
 *   - Freighter connect flow (wallet.hook.ts after address confirmed)
 *   - Pollar activate-wallet handler (after Pollar provisions G-address)
 *
 * Body: { walletAddress: string, chainType: 'STELLAR', isPrimary?: boolean }
 * Auth: Firebase Bearer token required
 */
router.post('/sync-wallet', authenticateFirebase, syncWalletHandler);

export default router;