import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { resolveDisputeHandler } from './resolve-dispute.handler.js';

const router = Router();
router.post('/resolve-dispute', authenticateFirebase, resolveDisputeHandler);
export default router;
