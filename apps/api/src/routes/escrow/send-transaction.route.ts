import { Router } from 'express';
import { sendTransactionHandler } from './send-transaction.handler.js';

const router = Router();

router.post('/send-transaction', sendTransactionHandler);

export default router;
