import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { recoverFromTxhashHandler } from './recover-from-txhash.handler.js';

const router = Router();

router.post('/recover-from-txhash', authenticateFirebase, recoverFromTxhashHandler);

export default router;
