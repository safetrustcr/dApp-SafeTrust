import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.middleware.js';
import { ApiError } from '../../../http/api-error.js';

vi.mock('../../../services/bids-db.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../services/bids-db.js')>();
  return {
    ...actual,
    getBidApartment: vi.fn(),
    getBidById: vi.fn(),
    createBidRequest: vi.fn(),
    listMyBids: vi.fn(),
    listApartmentBids: vi.fn(),
    updateBidStatus: vi.fn(),
  };
});

import {
  createBidRequest,
  getBidApartment,
  getBidById,
  listApartmentBids,
  listMyBids,
  updateBidStatus,
} from '../../../services/bids-db.js';
import {
  acceptBidHandler,
  createBidHandler,
  listApartmentBidsHandler,
  listMyBidsHandler,
  rejectBidHandler,
} from '../bids.handler.js';

const mockGetBidApartment = vi.mocked(getBidApartment);
const mockGetBidById = vi.mocked(getBidById);
const mockCreateBidRequest = vi.mocked(createBidRequest);
const mockListMyBids = vi.mocked(listMyBids);
const mockListApartmentBids = vi.mocked(listApartmentBids);
const mockUpdateBidStatus = vi.mocked(updateBidStatus);

const APT_ID = '550e8400-e29b-41d4-a716-446655440001';
const BID_ID = '660e8400-e29b-41d4-a716-446655440001';

function mockRes() {
  const res = {
    _status: null as number | null,
    _body: undefined as unknown,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(payload: unknown) {
      this._body = payload;
      return this;
    },
  };
  return res as unknown as Response & { _status: number | null; _body: unknown };
}

function mockReq(options: {
  uid?: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
} = {}) {
  return {
    user: { uid: options.uid ?? 'guest-uid-1', email: 'guest@example.com', role: 'guest' },
    body: options.body ?? {},
    params: options.params ?? {},
    query: options.query ?? {},
  } as unknown as AuthenticatedRequest;
}

describe('bids handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBidHandler', () => {
    it('rejects invalid apartmentId UUID with 400', async () => {
      const req = mockReq({
        body: { apartmentId: 'not-a-uuid', proposedPrice: 1200, desiredMoveIn: '2026-12-01T00:00:00Z' },
      });
      const res = mockRes();
      const next = vi.fn() as unknown as NextFunction;

      await createBidHandler(req, res, next);

      const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      expect(err.code).toBe('INVALID_APARTMENT_ID');
    });

    it('rejects non-positive proposedPrice with 400', async () => {
      const req = mockReq({
        body: { apartmentId: APT_ID, proposedPrice: 0, desiredMoveIn: '2026-12-01T00:00:00Z' },
      });
      const res = mockRes();
      const next = vi.fn() as unknown as NextFunction;

      await createBidHandler(req, res, next);

      const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
      expect(err.status).toBe(400);
      expect(err.code).toBe('INVALID_PROPOSED_PRICE');
    });

    it('rejects bidding on own apartment with 400', async () => {
      mockGetBidApartment.mockResolvedValueOnce({
        id: APT_ID,
        owner_id: 'guest-uid-1',
        name: 'My Apt',
        price: 1000,
        warranty_deposit: 1000,
        address: null,
        is_available: true,
      });

      const req = mockReq({
        uid: 'guest-uid-1',
        body: { apartmentId: APT_ID, proposedPrice: 1200, desiredMoveIn: '2026-12-01T00:00:00Z' },
      });
      const res = mockRes();
      const next = vi.fn() as unknown as NextFunction;

      await createBidHandler(req, res, next);

      const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
      expect(err.status).toBe(400);
      expect(err.code).toBe('CANNOT_BID_OWN_APARTMENT');
    });

    it('creates a bid request and returns 201', async () => {
      mockGetBidApartment.mockResolvedValueOnce({
        id: APT_ID,
        owner_id: 'host-uid-1',
        name: 'Ocean View',
        price: 1000,
        warranty_deposit: 1000,
        address: null,
        is_available: true,
      });
      const createdBid = {
        id: BID_ID,
        apartment_id: APT_ID,
        tenant_id: 'guest-uid-1',
        current_status: 'PENDING' as const,
        proposed_price: 1150,
        desired_move_in: '2026-12-01T00:00:00.000Z',
        created_at: '2026-11-25T20:00:00Z',
        updated_at: '2026-11-25T20:00:00Z',
      };
      mockCreateBidRequest.mockResolvedValueOnce(createdBid);

      const req = mockReq({
        uid: 'guest-uid-1',
        body: { apartmentId: APT_ID, proposedPrice: 1150, desiredMoveIn: '2026-12-01T00:00:00Z' },
      });
      const res = mockRes();
      const next = vi.fn() as unknown as NextFunction;

      await createBidHandler(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(201);
      expect(res._body).toEqual({ bid: createdBid });
    });
  });

  describe('listMyBidsHandler', () => {
    it('returns the authenticated guest bids', async () => {
      mockListMyBids.mockResolvedValueOnce({ bids: [], totalCount: 0 });
      const req = mockReq({ uid: 'guest-uid-1', query: { limit: '10', offset: '0' } });
      const res = mockRes();
      const next = vi.fn() as unknown as NextFunction;

      await listMyBidsHandler(req, res, next);

      expect(mockListMyBids).toHaveBeenCalledWith({
        tenantId: 'guest-uid-1',
        apartmentId: undefined,
        status: undefined,
        limit: 10,
        offset: 0,
      });
      expect(res._status).toBe(200);
      expect(res._body).toEqual({ bids: [], totalCount: 0, limit: 10, offset: 0 });
    });
  });

  describe('listApartmentBidsHandler', () => {
    it('returns 403 when caller is not the apartment owner', async () => {
      mockGetBidApartment.mockResolvedValueOnce({
        id: APT_ID,
        owner_id: 'other-host',
        name: 'Apt',
        price: 1000,
        warranty_deposit: 1000,
        address: null,
        is_available: true,
      });

      const req = mockReq({ uid: 'host-uid-1', params: { apartmentId: APT_ID } });
      const res = mockRes();
      const next = vi.fn() as unknown as NextFunction;

      await listApartmentBidsHandler(req, res, next);

      const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
      expect(err.status).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
    });

    it('returns apartment and filtered paginated offers for the host', async () => {
      const apartment = {
        id: APT_ID,
        owner_id: 'host-uid-1',
        name: 'Apt',
        price: 1000,
        warranty_deposit: 1000,
        address: { city: 'San José' },
        is_available: true,
      };
      mockGetBidApartment.mockResolvedValueOnce(apartment);
      mockListApartmentBids.mockResolvedValueOnce({
        offers: [
          {
            id: BID_ID,
            apartment_id: APT_ID,
            tenant_id: 'guest-uid-1',
            tenant_name: 'Jane Doe',
            tenant_phone: '+506 88887777',
            tenant_wallet_address: 'GABC...XYZ',
            proposed_price: 950,
            desired_move_in: '2026-12-01T00:00:00Z',
            current_status: 'PENDING',
            created_at: '2026-11-25T20:00:00Z',
            updated_at: '2026-11-25T20:00:00Z',
          },
        ],
        totalCount: 1,
      });

      const req = mockReq({
        uid: 'host-uid-1',
        params: { apartmentId: APT_ID },
        query: { status: 'PENDING', limit: '5', offset: '0' },
      });
      const res = mockRes();
      const next = vi.fn() as unknown as NextFunction;

      await listApartmentBidsHandler(req, res, next);

      expect(mockListApartmentBids).toHaveBeenCalledWith({
        apartmentId: APT_ID,
        status: 'PENDING',
        limit: 5,
        offset: 0,
      });
      expect(res._status).toBe(200);
      expect((res._body as { totalCount: number }).totalCount).toBe(1);
    });
  });

  describe('acceptBidHandler & rejectBidHandler', () => {
    it('accepts a PENDING bid for the host and records history', async () => {
      mockGetBidById.mockResolvedValueOnce({
        id: BID_ID,
        apartment_id: APT_ID,
        tenant_id: 'guest-uid-1',
        current_status: 'PENDING',
        proposed_price: 1000,
        desired_move_in: '2026-12-01T00:00:00Z',
        created_at: '2026-11-25T20:00:00Z',
        updated_at: '2026-11-25T20:00:00Z',
        apartment: { id: APT_ID, owner_id: 'host-uid-1', name: 'Apt' },
      });
      const updated = {
        bid: {
          id: BID_ID,
          apartment_id: APT_ID,
          tenant_id: 'guest-uid-1',
          current_status: 'APPROVED' as const,
          proposed_price: 1000,
          desired_move_in: '2026-12-01T00:00:00Z',
          created_at: '2026-11-25T20:00:00Z',
          updated_at: '2026-11-25T20:05:00Z',
        },
        history: {
          id: 'hist-1',
          bid_request_id: BID_ID,
          status: 'APPROVED' as const,
          notes: 'Accepted by host',
          changed_by: 'host-uid-1',
          created_at: '2026-11-25T20:05:00Z',
        },
      };
      mockUpdateBidStatus.mockResolvedValueOnce(updated);

      const req = mockReq({ uid: 'host-uid-1', params: { id: BID_ID } });
      const res = mockRes();
      const next = vi.fn() as unknown as NextFunction;

      await acceptBidHandler(req, res, next);

      expect(mockUpdateBidStatus).toHaveBeenCalledWith({
        bidId: BID_ID,
        nextStatus: 'APPROVED',
        allowedFromStatuses: ['PENDING', 'VIEWED'],
        actorId: 'host-uid-1',
        notes: 'Accepted by host',
      });
      expect(res._status).toBe(200);
      expect(res._body).toEqual(updated);
    });

    it('rejects a PENDING bid for the host and records history', async () => {
      mockGetBidById.mockResolvedValueOnce({
        id: BID_ID,
        apartment_id: APT_ID,
        tenant_id: 'guest-uid-1',
        current_status: 'PENDING',
        proposed_price: 1000,
        desired_move_in: '2026-12-01T00:00:00Z',
        created_at: '2026-11-25T20:00:00Z',
        updated_at: '2026-11-25T20:00:00Z',
        apartment: { id: APT_ID, owner_id: 'host-uid-1', name: 'Apt' },
      });
      const updated = {
        bid: {
          id: BID_ID,
          apartment_id: APT_ID,
          tenant_id: 'guest-uid-1',
          current_status: 'CANCELLED' as const,
          proposed_price: 1000,
          desired_move_in: '2026-12-01T00:00:00Z',
          created_at: '2026-11-25T20:00:00Z',
          updated_at: '2026-11-25T20:05:00Z',
        },
        history: {
          id: 'hist-2',
          bid_request_id: BID_ID,
          status: 'CANCELLED' as const,
          notes: 'Not a fit',
          changed_by: 'host-uid-1',
          created_at: '2026-11-25T20:05:00Z',
        },
      };
      mockUpdateBidStatus.mockResolvedValueOnce(updated);

      const req = mockReq({
        uid: 'host-uid-1',
        params: { id: BID_ID },
        body: { notes: 'Not a fit' },
      });
      const res = mockRes();
      const next = vi.fn() as unknown as NextFunction;

      await rejectBidHandler(req, res, next);

      expect(mockUpdateBidStatus).toHaveBeenCalledWith({
        bidId: BID_ID,
        nextStatus: 'CANCELLED',
        allowedFromStatuses: ['PENDING', 'VIEWED', 'APPROVED'],
        actorId: 'host-uid-1',
        notes: 'Not a fit',
      });
      expect(res._status).toBe(200);
      expect(res._body).toEqual(updated);
    });

    it('returns 409 when trying to accept an already CANCELLED bid', async () => {
      mockGetBidById.mockResolvedValueOnce({
        id: BID_ID,
        apartment_id: APT_ID,
        tenant_id: 'guest-uid-1',
        current_status: 'CANCELLED',
        proposed_price: 1000,
        desired_move_in: '2026-12-01T00:00:00Z',
        created_at: '2026-11-25T20:00:00Z',
        updated_at: '2026-11-25T20:00:00Z',
        apartment: { id: APT_ID, owner_id: 'host-uid-1', name: 'Apt' },
      });

      const req = mockReq({ uid: 'host-uid-1', params: { id: BID_ID } });
      const res = mockRes();
      const next = vi.fn() as unknown as NextFunction;

      await acceptBidHandler(req, res, next);

      const err = vi.mocked(next).mock.calls[0][0] as unknown as ApiError;
      expect(err.status).toBe(409);
      expect(err.code).toBe('INVALID_BID_TRANSITION');
    });
  });
});
