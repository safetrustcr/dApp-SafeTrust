import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticateFirebase, type AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { promoteToHostHandler } from './promote-to-host.handler.js';

const router: Router = Router();

/**
 * Cast promoteToHostHandler to RequestHandler so Express overload resolution
 * accepts it alongside authenticateFirebase.
 *
 * The handler receives AuthenticatedRequest (set by authenticateFirebase) — the
 * cast is safe because authenticateFirebase always populates req.user before
 * next() is called.
 */
router.post(
  '/promote-to-host',
  authenticateFirebase,
  promoteToHostHandler as unknown as RequestHandler,
);

export default router;