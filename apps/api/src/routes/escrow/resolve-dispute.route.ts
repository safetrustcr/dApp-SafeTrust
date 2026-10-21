import { Router, type RequestHandler } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/require-admin.js';
import { resolveDisputeHandler } from './resolve-dispute.handler.js';

const router = Router();

// Admin role (route) AND platform dispute-resolver wallet (escrow-authz) are both required.
router.post(
  '/resolve-dispute',
  authenticateFirebase,
  requireAdmin as unknown as RequestHandler,
  resolveDisputeHandler,
);

export default router;