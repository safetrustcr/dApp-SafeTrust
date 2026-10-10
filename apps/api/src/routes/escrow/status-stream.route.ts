import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { assertEscrowParticipant, EscrowAccessError } from '../../services/escrow-authz.js';
import { statusStreamHandler } from './status-stream.handler.js';

const router = Router();

type AuthedRequest = Request & { user?: { uid: string } };

/** Only a wallet holding a role on the escrow may stream its status. */
async function requireEscrowParticipant(req: AuthedRequest, res: Response, next: NextFunction) {
  const engagementId = String(req.params.engagementId ?? req.query.engagementId ?? '');
  if (!req.user?.uid) return res.status(401).json({ error: 'Sign in first.' });
  if (!engagementId) return res.status(400).json({ error: 'engagementId is required.' });
  try {
    await assertEscrowParticipant(req.user.uid, engagementId);
    return next();
  } catch (err) {
    if (err instanceof EscrowAccessError) return res.status(err.status).json({ error: err.message, code: err.code });
    return next(err);
  }
}

// ⚠️ Keep the path your status-stream.handler.ts currently uses; only the middleware chain is new.
router.get('/status-stream/:engagementId', authenticateFirebase, requireEscrowParticipant, statusStreamHandler);

export default router;
