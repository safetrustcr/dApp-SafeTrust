import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { startConversationHandler } from './conversations.handler.js';

const router: Router = Router();

/**
 * Cast startConversationHandler to RequestHandler — same pattern as send.message.
 * authenticateFirebase populates req.user before the handler is called.
 */
router.post(
  '/conversations',
  authenticateFirebase,
  startConversationHandler as unknown as RequestHandler,
);

export default router;
