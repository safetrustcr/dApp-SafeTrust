import { Router } from 'express';
import { milestoneStatusHandler } from './milestone-status.handler.js';

const router = Router();

router.post('/milestone-status', milestoneStatusHandler);

export default router;
