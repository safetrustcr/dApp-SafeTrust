import { Router } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/rate-limit.middleware.js';
import { recoverFromTxhashHandler } from './recover-from-txhash.handler.js';

const router = Router();

// 5 recoveries per user per minute. Trustless Work allows 50 requests / 60s / API key,
// shared by every user and the cron job, so keep this tight.
const recoverRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.user?.uid ?? req.ip,
  message: 'TOO_MANY_RECOVERY_REQUESTS',
});

router.post(
  '/recover-from-txhash',
  authenticateFirebase,
  recoverRateLimit,
  recoverFromTxhashHandler,
);

export default router;
