import { Router } from 'express';
import type { Request, RequestHandler } from 'express';

import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/require-admin.js';
import { promoteHotelManagerHandler } from './promote-hotel-manager.handler.js';

const router = Router();

router.use(authenticateFirebase, requireAdmin as unknown as RequestHandler);

const promote = promoteHotelManagerHandler as unknown as RequestHandler;

/**
 * POST /api/admin/hotel-users/promote-manager
 * Body: { firebaseUid: string }
 */
router.post('/hotel-users/promote-manager', promote);

/**
 * PATCH /api/admin/hotel-users/:firebaseUid/manager
 */
router.patch('/hotel-users/:firebaseUid/manager', (req, res, next) => {
  (req.body as Record<string, unknown>) ??= {};
  req.body.firebaseUid = req.params.firebaseUid;
  return promote(req, res, next);
});

export default router;
