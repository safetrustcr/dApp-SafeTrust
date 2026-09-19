import { Router } from 'express';
import { fundEscrowHandler } from './fund.handler.js';

const router = Router();

router.post('/fund', fundEscrowHandler);

export default router;
