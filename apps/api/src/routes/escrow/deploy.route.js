import express from 'express';
import { deployEscrowHandler } from './deploy.handler.js';

import { Router } from 'express';
const router = Router();

/**
 * POST /api/escrow/deploy
 */
router.post('/deploy', deployEscrowHandler);

export default router;