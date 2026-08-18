import { Router } from 'express';

import { requireAuth, type AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { promoteToHostHandler } from './promote-to-host.handler.js';

const router = Router();

/**
 * POST /api/auth/promote-to-host
 */
router.post('/promote-to-host', requireAuth, (req, res) =>
  promoteToHostHandler(req as AuthenticatedRequest, res),
);

export default router;
