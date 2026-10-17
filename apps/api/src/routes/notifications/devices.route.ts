import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { registerDeviceHandler, unregisterDeviceHandler } from './devices.handler.js';

const router = Router();

router.post('/devices', authenticateFirebase, registerDeviceHandler);
router.delete('/devices', authenticateFirebase, unregisterDeviceHandler);

export default router;
