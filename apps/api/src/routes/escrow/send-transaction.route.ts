import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { sendTransactionHandler } from './send-transaction.handler.js';

const router = Router();

router.post('/send-transaction', authenticateFirebase, sendTransactionHandler);

export default router;
