import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { sendMessageHandler } from './send.handler.js';

const router = Router();

router.post('/send', requireAuth, sendMessageHandler);

export default router;
