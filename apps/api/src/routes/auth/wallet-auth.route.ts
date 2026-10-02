import { Router } from 'express';
import {
  createWalletChallengeHandler,
  verifyWalletChallengeHandler,
} from './wallet-auth.handler.js';

const router: Router = Router();

router.post('/challenge', (req, res) => createWalletChallengeHandler(req, res));
router.post('/verify', (req, res) => verifyWalletChallengeHandler(req, res));

export default router;
