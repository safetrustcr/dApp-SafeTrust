import { Router } from 'express';
import { activateWalletHandler } from './activate-wallet.handler.js';

const router: Router = Router();

/**
 * POST /api/auth/activate-wallet
 *
 * Activates a Pollar embedded Stellar wallet for LATAM users who cannot use
 * Freighter. Verifies the Firebase token, calls the Pollar SDK, and saves
 * the returned G-address to public.user_wallets (provider: "pollar").
 *
 * Prerequisite: POLLAR_SECRET_KEY must be set in apps/api/.env
 */
router.post('/activate-wallet', activateWalletHandler);

export default router;