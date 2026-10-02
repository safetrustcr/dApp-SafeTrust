import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireIdempotencyKey } from '../../middleware/idempotency-key.js';
import { milestoneStatusHandler } from './milestone-status.handler.js';

const router = Router();

router.post('/milestone-status', authenticateFirebase, requireIdempotencyKey('/api/escrow/milestone-status'), milestoneStatusHandler);

export default router;
