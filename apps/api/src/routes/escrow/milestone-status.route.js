import express from 'express';
import { changeMilestoneStatusHandler } from './milestone-status.handler.js';

const router = express.Router();

/**
 * POST /api/escrow/milestone-status
 */
router.post('/milestone-status', changeMilestoneStatusHandler);

export default router;
