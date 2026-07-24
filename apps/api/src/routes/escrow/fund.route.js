import express from 'express';
import { fundEscrowHandler } from './fund.handler.js';

const router = express.Router();

/**
 * POST /api/escrow/fund
 */
router.post('/fund', fundEscrowHandler);

export default router;
