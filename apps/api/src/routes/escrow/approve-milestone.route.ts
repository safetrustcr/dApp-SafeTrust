import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { approveMilestoneHandler } from './approve-milestone.handler.js';

const router = Router();
router.post('/approve-milestone', authenticateFirebase, approveMilestoneHandler);
export default router;
