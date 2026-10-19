import { Router } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { registerDeviceHandler, unregisterDeviceHandler } from './devices.handler.js';

const router = Router();

router.post('/devices', authenticateFirebase, asyncHandler(registerDeviceHandler));
router.delete('/devices', authenticateFirebase, asyncHandler(unregisterDeviceHandler));

export default router;
