import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireIdempotencyKey } from '../../middleware/idempotency-key.js';
import { disputeHandler } from './dispute.handler.js';

const router = Router();

router.post('/dispute', authenticateFirebase, requireIdempotencyKey('/api/escrow/dispute'), disputeHandler);

export default router;
