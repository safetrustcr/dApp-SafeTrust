import { Router } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { ApiError } from '../../http/api-error.js';
import { getRentalProperties } from '../../services/rental-properties.js';

const router = Router();
router.get('/', asyncHandler(async (req, res) => {
  const kind = req.query.kind ?? 'both';
  if (kind !== 'apartment' && kind !== 'hotel' && kind !== 'both') throw new ApiError(400, 'INVALID_PROPERTY_KIND', 'Choose apartments, hotels, or both.');
  const limit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) throw new ApiError(400, 'INVALID_PAGINATION', 'Use a limit between 1 and 100 and a non-negative offset.');
  const properties = await getRentalProperties(kind, limit, offset);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ properties, hasMore: properties.filter((property) => property.kind === 'apartment').length === limit || properties.filter((property) => property.kind === 'hotel').length === limit });
}));
export default router;
