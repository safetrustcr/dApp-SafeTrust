import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireIdempotencyKey } from '../../middleware/idempotency-key.js';
import { releaseFundsHandler } from './release-funds.handler.js';

const router = Router();

// One canonical path. The former `/release` alias was removed in #443.
router.post('/release-funds', authenticateFirebase, requireIdempotencyKey('/api/escrow/release-funds'), releaseFundsHandler);

export default router;
