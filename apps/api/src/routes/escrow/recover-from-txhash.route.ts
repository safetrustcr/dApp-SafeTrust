import { Router } from 'express';
import { recoverFromTxhashHandler } from './recover-from-txhash.handler.js';

const router = Router();

router.post('/recover-from-txhash', recoverFromTxhashHandler);

export default router;
