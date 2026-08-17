import express from 'express';
import { changeMilestoneStatusHandler } from './milestone-status.handler.js';

import { Router } from 'express';
const router = Router();

/**
 * POST /api/escrow/milestone-status
 */
router.post('/milestone-status', changeMilestoneStatusHandler);

export default router;
