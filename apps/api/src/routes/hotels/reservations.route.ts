import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { createReservationHandler } from './create-reservation.handler.js';

const router = Router();

// Middleware: ensure caller is authenticated with Firebase
router.use(authenticateFirebase as unknown as RequestHandler);

// Optional tenant guard: hotel operations target hotel_industry
router.use((req, res, next) => {
  if (req.tenant && req.tenant !== 'hotel_industry') {
    return res.status(400).json({
      error: 'Invalid tenant',
      message: 'Hotel operations require X-Tenant-ID: hotel_industry',
    });
  }
  next();
});

router.post('/', createReservationHandler as unknown as RequestHandler);

export default router;
