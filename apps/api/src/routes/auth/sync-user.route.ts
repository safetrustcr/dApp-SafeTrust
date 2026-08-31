import { Router } from 'express';
import { syncUserHandler } from './sync-user.handler.js';

const router = Router();
router.post('/sync-user', syncUserHandler);
export default router;
