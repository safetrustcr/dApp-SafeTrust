import { Router, type RequestHandler } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireIdempotencyKey } from '../../middleware/idempotency-key.js';
import { requireAdmin } from '../../middleware/require-admin.js';
import { resolveDisputeHandler } from './resolve-dispute.handler.js';

const router = Router();

// Admin role (route) AND platform dispute-resolver wallet (escrow-authz) are both required.
// The Idempotency-Key guard runs before the admin check, like every other build
// route, so a retried resolve replays its stored response instead of rebuilding.
router.post(
  '/resolve-dispute',
  authenticateFirebase,
  requireIdempotencyKey('/api/escrow/resolve-dispute'),
  requireAdmin as unknown as RequestHandler,
  resolveDisputeHandler,
);

export default router;