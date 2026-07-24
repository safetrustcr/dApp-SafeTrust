import express from 'express';
import { releaseFundsHandler } from './release-funds.handler.js';

const router = express.Router();

/**
 * POST /api/escrow/release-funds
 */
router.post('/release-funds', releaseFundsHandler);

export default router;
