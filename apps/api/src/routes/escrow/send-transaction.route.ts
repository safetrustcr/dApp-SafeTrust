import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireIdempotencyKey } from '../../middleware/idempotency-key.js';
import { sendTransactionHandler } from './send-transaction.handler.js';

const router = Router();

router.post('/send-transaction', authenticateFirebase, requireIdempotencyKey, sendTransactionHandler);

export default router;
