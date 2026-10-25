import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { getReadinessHandler, buildTrustlineHandler } from './readiness.handler.js';

const router = Router();

router.get('/readiness', authenticateFirebase, getReadinessHandler);
router.post('/readiness/trustline', authenticateFirebase, buildTrustlineHandler);

export default router;
