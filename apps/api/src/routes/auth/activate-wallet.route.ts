import { Router } from 'express';
import { activateWalletHandler } from './activate-wallet.handler.js';

const router = Router();
router.post('/activate-wallet', activateWalletHandler);
export default router;
