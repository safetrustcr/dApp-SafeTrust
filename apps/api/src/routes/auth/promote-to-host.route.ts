import { Router } from 'express';
import { requireAuth as authenticateFirebase } from '../../middleware/auth.middleware.js';
import { promoteToHostHandler } from './promote-to-host.handler.js';

const router: Router = Router();

router.post('/promote-to-host', authenticateFirebase, promoteToHostHandler);

export default router;
