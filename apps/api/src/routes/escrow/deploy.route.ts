import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireIdempotencyKey } from '../../middleware/idempotency-key.js';
import { deployEscrowHandler } from './deploy.handler.js';

const router = Router();

router.post('/deploy', authenticateFirebase, requireIdempotencyKey('/api/escrow/deploy'), deployEscrowHandler);

export default router;
