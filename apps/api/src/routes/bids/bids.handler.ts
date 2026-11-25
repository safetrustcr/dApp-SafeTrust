import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';
import {
  createBidRequest,
  getBidApartment,
  getBidById,
  isValidBidStatus,
  isValidUuid,
  listApartmentBids,
  listMyBids,
  updateBidStatus,
  type BidStatus,
} from '../../services/bids-db.js';

function parsePagination(query: Record<string, unknown>, defaultLimit: number): { limit: number; offset: number } {
  const limit = query.limit === undefined ? defaultLimit : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
    throw new ApiError(400, 'INVALID_PAGINATION', 'limit must be 1–100 and offset must be a non-negative integer.');
  }

  return { limit, offset };
}

function parseOptionalStatusFilter(rawStatus: unknown): BidStatus | undefined {
  if (rawStatus === undefined || rawStatus === '' || rawStatus === 'ALL') {
    return undefined;
  }
  if (!isValidBidStatus(rawStatus)) {
    throw new ApiError(400, 'INVALID_BID_STATUS', 'Invalid bid status filter.');
  }
  return rawStatus;
}

function parseNotes(rawNotes: unknown): string | undefined {
  if (rawNotes === undefined || rawNotes === null) {
    return undefined;
  }
  if (typeof rawNotes !== 'string') {
    throw new ApiError(400, 'INVALID_NOTES', 'notes must be a string.');
  }
  const trimmed = rawNotes.trim();
  if (trimmed.length > 500) {
    throw new ApiError(400, 'INVALID_NOTES', 'notes must be at most 500 characters.');
  }
  return trimmed || undefined;
}

export const createBidHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { apartmentId, proposedPrice, desiredMoveIn } = req.body ?? {};

    if (!isValidUuid(apartmentId)) {
      throw new ApiError(400, 'INVALID_APARTMENT_ID', 'A valid apartmentId UUID is required.');
    }

    const parsedPrice = Number(proposedPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      throw new ApiError(400, 'INVALID_PROPOSED_PRICE', 'proposedPrice must be a positive number.');
    }

    if (typeof desiredMoveIn !== 'string' || Number.isNaN(Date.parse(desiredMoveIn))) {
      throw new ApiError(400, 'INVALID_MOVE_IN_DATE', 'desiredMoveIn must be a valid ISO date.');
    }

    const apartment = await getBidApartment(apartmentId.trim());
    if (!apartment) {
      throw new ApiError(404, 'APARTMENT_NOT_FOUND', 'Apartment not found.');
    }

    if (!apartment.is_available) {
      throw new ApiError(409, 'APARTMENT_UNAVAILABLE', 'This apartment is not currently available for offers.');
    }

    if (apartment.owner_id === req.user.uid) {
      throw new ApiError(400, 'CANNOT_BID_OWN_APARTMENT', 'You cannot make an offer on your own apartment.');
    }

    const bid = await createBidRequest({
      apartmentId: apartment.id,
      tenantId: req.user.uid,
      proposedPrice: Math.round(parsedPrice * 100) / 100,
      desiredMoveIn: new Date(desiredMoveIn).toISOString(),
    });

    return res.status(201).json({ bid });
  },
);

export const listMyBidsHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { limit, offset } = parsePagination(req.query as Record<string, unknown>, 20);
    const status = parseOptionalStatusFilter(req.query.status);
    const rawApartmentId = req.query.apartmentId;

    let apartmentId: string | undefined;
    if (rawApartmentId !== undefined && rawApartmentId !== '') {
      if (!isValidUuid(rawApartmentId)) {
        throw new ApiError(400, 'INVALID_APARTMENT_ID', 'apartmentId must be a valid UUID.');
      }
      apartmentId = rawApartmentId.trim();
    }

    const result = await listMyBids({
      tenantId: req.user.uid,
      apartmentId,
      status,
      limit,
      offset,
    });

    return res.status(200).json({
      ...result,
      limit,
      offset,
    });
  },
);

export const listApartmentBidsHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const apartmentId = req.params.apartmentId;
    if (!isValidUuid(apartmentId)) {
      throw new ApiError(400, 'INVALID_APARTMENT_ID', 'A valid apartmentId UUID is required.');
    }

    const apartment = await getBidApartment(apartmentId.trim());
    if (!apartment) {
      throw new ApiError(404, 'APARTMENT_NOT_FOUND', 'Apartment not found.');
    }

    if (apartment.owner_id !== req.user.uid) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the apartment host can view offers for this listing.');
    }

    const { limit, offset } = parsePagination(req.query as Record<string, unknown>, 10);
    const status = parseOptionalStatusFilter(req.query.status);

    const { offers, totalCount } = await listApartmentBids({
      apartmentId: apartment.id,
      status,
      limit,
      offset,
    });

    return res.status(200).json({
      apartment,
      offers,
      totalCount,
      limit,
      offset,
    });
  },
);

export const acceptBidHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const bidId = req.params.id;
    if (!isValidUuid(bidId)) {
      throw new ApiError(400, 'INVALID_BID_ID', 'A valid bid ID UUID is required.');
    }

    const notes = parseNotes(req.body?.notes);
    const existing = await getBidById(bidId.trim());
    if (!existing) {
      throw new ApiError(404, 'BID_NOT_FOUND', 'Offer not found.');
    }

    if (existing.apartment?.owner_id !== req.user.uid) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the apartment host can accept this offer.');
    }

    if (existing.current_status !== 'PENDING' && existing.current_status !== 'VIEWED') {
      throw new ApiError(
        409,
        'INVALID_BID_TRANSITION',
        `Cannot accept an offer with status ${existing.current_status}.`,
      );
    }

    const result = await updateBidStatus({
      bidId: existing.id,
      nextStatus: 'APPROVED',
      allowedFromStatuses: ['PENDING', 'VIEWED'],
      actorId: req.user.uid,
      notes: notes ?? 'Accepted by host',
    });

    return res.status(200).json(result);
  },
);

export const rejectBidHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const bidId = req.params.id;
    if (!isValidUuid(bidId)) {
      throw new ApiError(400, 'INVALID_BID_ID', 'A valid bid ID UUID is required.');
    }

    const notes = parseNotes(req.body?.notes);
    const existing = await getBidById(bidId.trim());
    if (!existing) {
      throw new ApiError(404, 'BID_NOT_FOUND', 'Offer not found.');
    }

    if (existing.apartment?.owner_id !== req.user.uid) {
      throw new ApiError(403, 'FORBIDDEN', 'Only the apartment host can reject this offer.');
    }

    if (
      existing.current_status !== 'PENDING' &&
      existing.current_status !== 'VIEWED' &&
      existing.current_status !== 'APPROVED'
    ) {
      throw new ApiError(
        409,
        'INVALID_BID_TRANSITION',
        `Cannot reject an offer with status ${existing.current_status}.`,
      );
    }

    const result = await updateBidStatus({
      bidId: existing.id,
      nextStatus: 'CANCELLED',
      allowedFromStatuses: ['PENDING', 'VIEWED', 'APPROVED'],
      actorId: req.user.uid,
      notes: notes ?? 'Rejected by host',
    });

    return res.status(200).json(result);
  },
);
