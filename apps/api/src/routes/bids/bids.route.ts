import { Router } from 'express';
import type { RequestHandler } from 'express';
import { authenticateFirebase } from '../../middleware/auth.middleware.js';
import {
  acceptBidHandler,
  createBidHandler,
  listApartmentBidsHandler,
  listMyBidsHandler,
  rejectBidHandler,
} from './bids.handler.js';

const router: Router = Router();

router.post(
  '/',
  authenticateFirebase,
  createBidHandler as unknown as RequestHandler,
);

router.get(
  '/mine',
  authenticateFirebase,
  listMyBidsHandler as unknown as RequestHandler,
);

router.get(
  '/apartment/:apartmentId',
  authenticateFirebase,
  listApartmentBidsHandler as unknown as RequestHandler,
);

router.post(
  '/:id/accept',
  authenticateFirebase,
  acceptBidHandler as unknown as RequestHandler,
);

router.post(
  '/:id/reject',
  authenticateFirebase,
  rejectBidHandler as unknown as RequestHandler,
);

export default router;
