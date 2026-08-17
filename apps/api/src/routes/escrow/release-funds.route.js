import express from 'express';
import { releaseFundsHandler } from './release-funds.handler.js';

import { Router } from 'express';
const router = Router();

/**
 * POST /api/escrow/release-funds
 */
router.post('/release-funds', releaseFundsHandler);

export default router;
