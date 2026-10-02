import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { sendMessageHandler } from './send.handler.js';

const router: Router = Router();

/**
 * Cast sendMessageHandler to RequestHandler — same pattern as promote-to-host.
 * authenticateFirebase populates req.user before the handler is called.
 */
router.post(
  '/send',
  authenticateFirebase,
  sendMessageHandler as unknown as RequestHandler,
);

export default router;