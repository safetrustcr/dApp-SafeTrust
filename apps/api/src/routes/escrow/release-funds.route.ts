import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireIdempotencyKey } from '../../middleware/idempotency-key.js';
import { releaseFundsHandler } from './release-funds.handler.js';

const router = Router();

router.post('/release-funds', authenticateFirebase, requireIdempotencyKey, releaseFundsHandler);
router.post('/release', authenticateFirebase, requireIdempotencyKey, releaseFundsHandler);

export default router;
