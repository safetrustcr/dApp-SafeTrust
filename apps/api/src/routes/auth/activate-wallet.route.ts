import { Router } from 'express';
import { activateWalletHandler } from './activate-wallet.handler.js';

const router: Router = Router();

/**
 * POST /api/auth/activate-wallet
 *
 * Verifies the Firebase and Pollar sessions and saves the matching Stellar
 * wallet to public.user_wallets (provider: "pollar").
 * Expects the browser wallet address and Pollar SDK access token in the body.
 *
 * Prerequisite: POLLAR_SECRET_KEY must be set in apps/api/.env
 */
router.post('/activate-wallet', activateWalletHandler);

export default router;