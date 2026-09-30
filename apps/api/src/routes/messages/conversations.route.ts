import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import {
  startConversationHandler,
  markConversationReadHandler,
} from './conversations.handler.js';

const router: Router = Router();

router.post(
  '/conversations',
  authenticateFirebase,
  startConversationHandler as unknown as RequestHandler,
);

router.post(
  '/conversations/:id/read',
  authenticateFirebase,
  markConversationReadHandler as unknown as RequestHandler,
);

export default router;
