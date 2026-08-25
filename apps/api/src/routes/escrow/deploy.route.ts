import { Router } from 'express';
import { deployEscrowHandler } from './deploy.handler.js';

const router = Router();

router.post('/deploy', deployEscrowHandler);

export default router;
