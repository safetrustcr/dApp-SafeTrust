import express from 'express';
import { deployEscrowHandler } from './deploy.handler.js';

const router = express.Router();

/**
 * POST /api/escrow/deploy
 */
router.post('/deploy', deployEscrowHandler);

export default router;