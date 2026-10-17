import { Router, Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { syncEscrows } from '../../services/escrow-reconcile.js';

const router = Router();

export function requireCronSecret(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.RECONCILIATION_SECRET;
  const provided = req.get('x-reconciliation-secret') ?? '';

  if (!expected || expected.trim().length === 0) {
    res.status(500).json({ error: 'RECONCILIATION_SECRET is not configured.' });
    return;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    res.status(401).json({ error: 'Unauthorized.' });
    return;
  }

  next();
}

router.post('/sync-escrows', requireCronSecret, async (_req: Request, res: Response) => {
  try {
    const summary = await syncEscrows();
    return res.status(200).json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Reconciliation failed.';
    return res.status(500).json({ error: message, confirmed: 0, failed: 0, expired: 0, corrected: 0, errors: 1 });
  }
});

export default router;
