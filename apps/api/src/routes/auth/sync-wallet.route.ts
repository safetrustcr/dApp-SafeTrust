import { Router } from 'express';
import * as authMiddleware from '../../middleware/auth.middleware.js';
import { syncWalletHandler, getPrimaryWalletHandler } from './sync-wallet.handler.js';

const authenticateFirebase =
  (authMiddleware as any).authenticateFirebase ??
  (authMiddleware as any).default?.authenticateFirebase ??
  (authMiddleware as any).default;

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
router.post('/sync-wallet', authenticateFirebase, (req, res, next) =>
  syncWalletHandler(req as any, res as any, next)
);

/**
 * GET /api/auth/sync-wallet
 *
 * Returns the primary registered Stellar wallet address for the authenticated user.
 * Used by useWalletBridge to verify if the connected wallet is registered (#443 rules).
 */
router.get('/sync-wallet', authenticateFirebase, (req, res) =>
  getPrimaryWalletHandler(req as any, res as any)
);

export default router;