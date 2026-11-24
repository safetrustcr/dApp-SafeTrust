import { Router, type NextFunction, type Request, type Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { assertContractParticipant, EscrowAccessError } from '../../services/escrow-authz.js';
import { escrowStatusStreamHandler } from './status-stream.handler.js';

const router = Router();

type StreamRequest = Request & { user?: { uid: string } };

/**
 * EventSource cannot set headers, so the Firebase ID token is accepted either
 * as `Authorization: Bearer <token>` or as `?access_token=<token>`.
 */
async function authenticateStream(req: StreamRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ')
    ? header.slice(7)
    : typeof req.query.access_token === 'string'
      ? req.query.access_token
      : undefined;

  if (!token) return res.status(401).json({ error: 'Sign in first.' });
  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.user = { uid: decoded.uid };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/** Only a wallet holding a role on the escrow may stream its status. */
async function requireContractParticipant(req: StreamRequest, res: Response, next: NextFunction) {
  const contractId = typeof req.query.contractId === 'string' ? req.query.contractId : '';
  if (!contractId) return res.status(400).json({ error: 'contractId is required.' });
  try {
    await assertContractParticipant(req.user!.uid, contractId);
    return next();
  } catch (err) {
    if (err instanceof EscrowAccessError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    return next(err);
  }
}

// GET /api/escrow/status-stream?contractId=C…&access_token=…
router.get('/status-stream', authenticateStream, requireContractParticipant, escrowStatusStreamHandler);

export default router;