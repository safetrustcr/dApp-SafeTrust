import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireIdempotencyKey } from '../../middleware/idempotency-key.js';
import { approveMilestoneHandler } from './approve-milestone.handler.js';

const router = Router();
router.post('/approve-milestone', authenticateFirebase, requireIdempotencyKey, approveMilestoneHandler);
export default router;
