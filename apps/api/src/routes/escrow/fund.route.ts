import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireIdempotencyKey } from '../../middleware/idempotency-key.js';
import { fundEscrowHandler } from './fund.handler.js';

const router = Router();

router.post('/fund', authenticateFirebase, requireIdempotencyKey('/api/escrow/fund'), fundEscrowHandler);

export default router;
