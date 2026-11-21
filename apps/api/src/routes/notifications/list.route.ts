import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { listNotificationsHandler } from './list.handler.js';

const router: Router = Router();

router.get('/', authenticateFirebase, listNotificationsHandler);

export default router;
