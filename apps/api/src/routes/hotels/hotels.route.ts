import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import { createHotelHandler } from './create-hotel.handler.js';
import { updateHotelHandler } from './update-hotel.handler.js';
import { deleteHotelHandler } from './delete-hotel.handler.js';

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

router.post('/', createHotelHandler as unknown as RequestHandler);
router.patch('/:id', updateHotelHandler as unknown as RequestHandler);
router.delete('/:id', deleteHotelHandler as unknown as RequestHandler);

export default router;
