import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { milestoneStatusHandler } from './milestone-status.handler.js';

const router = Router();

router.post('/milestone-status', authenticateFirebase, milestoneStatusHandler);

export default router;
