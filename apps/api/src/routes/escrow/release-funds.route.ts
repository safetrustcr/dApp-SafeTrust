import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { releaseFundsHandler } from './release-funds.handler.js';

const router = Router();

router.post('/release-funds', authenticateFirebase, releaseFundsHandler);
router.post('/release', authenticateFirebase, releaseFundsHandler);

export default router;
