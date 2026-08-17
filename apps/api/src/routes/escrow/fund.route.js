import express, { Router } from 'express';
import { fundEscrowHandler } from './fund.handler.js';

const router = Router();

/**
 * POST /api/escrow/fund
 */
router.post('/fund', fundEscrowHandler);

export default router;
