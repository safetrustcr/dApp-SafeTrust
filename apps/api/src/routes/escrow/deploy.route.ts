import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { deployEscrowHandler } from './deploy.handler.js';

const router = Router();

router.post('/deploy', authenticateFirebase, deployEscrowHandler);

export default router;
