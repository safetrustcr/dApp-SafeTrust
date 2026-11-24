import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireIdempotencyKey } from '../../middleware/idempotency-key.js';
import { disputeHandler, getDisputeHandler } from './dispute.handler.js';

const router = Router();

router.post('/dispute', authenticateFirebase, requireIdempotencyKey('/api/escrow/dispute'), disputeHandler);
router.get('/dispute', authenticateFirebase, getDisputeHandler);

export default router;
