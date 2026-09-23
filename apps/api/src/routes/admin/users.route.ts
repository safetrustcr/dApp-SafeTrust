import { Router } from 'express';
import type { RequestHandler } from 'express';

import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/require-admin.js';
import {
  changeUserRoleHandler,
  createManagedUserHandler,
  listUsersHandler,
} from './users.handler.js';

const router = Router();

router.use(authenticateFirebase, requireAdmin as unknown as RequestHandler);
router.get('/users', listUsersHandler);
router.post('/users', createManagedUserHandler as unknown as RequestHandler);
router.patch('/users/:userId/role', changeUserRoleHandler as unknown as RequestHandler);

export default router;
