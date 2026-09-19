import { Router } from 'express';
import { releaseFundsHandler } from './release-funds.handler.js';

const router = Router();

router.post('/release-funds', releaseFundsHandler);
router.post('/release', releaseFundsHandler);

export default router;
