import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getIdToken } = vi.hoisted(() => ({
  getIdToken: vi.fn(async () => 'token-test-123'),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken } },
}));

import {
  acceptBid,
  createBid,
  getApartmentBids,
  getMyBids,
  rejectBid,
} from './bids';
import { ApiClientError } from './client';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('bids API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createBid sends POST /api/bids with Bearer token', async () => {
    const mockBid = {
      id: 'bid-1',
      apartment_id: 'apt-1',
      tenant_id: 'guest-1',
      current_status: 'PENDING',
      proposed_price: 1200,
      desired_move_in: '2026-12-01T00:00:00.000Z',
      created_at: '2026-11-25T10:00:00Z',
      updated_at: '2026-11-25T10:00:00Z',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse({ bid: mockBid }, 201));

    const res = await createBid({
      apartmentId: 'apt-1',
      proposedPrice: 1200,
      desiredMoveIn: '2026-12-01T00:00:00.000Z',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe('http://localhost:3002/api/bids');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer token-test-123');
    expect(res.bid).toEqual(mockBid);
  });

  it('getApartmentBids passes status filter and pagination query params', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        apartment: { id: 'apt-1', name: 'Apt', price: 1000, warranty_deposit: 1000, address: null, is_available: true, owner_id: 'host-1' },
        offers: [],
        totalCount: 0,
        limit: 10,
        offset: 10,
      }),
    );

    await getApartmentBids('apt-1', { status: 'PENDING', limit: 10, offset: 10 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3002/api/bids/apartment/apt-1?status=PENDING&limit=10&offset=10');
    expect(init.method).toBe('GET');
  });

  it('getMyBids passes apartmentId filter', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ bids: [], totalCount: 0, limit: 20, offset: 0 }));

    await getMyBids({ apartmentId: 'apt-1' });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('http://localhost:3002/api/bids/mine?apartmentId=apt-1');
  });

  it('acceptBid sends POST /api/bids/:id/accept', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ bid: { id: 'bid-1', current_status: 'APPROVED' }, history: { id: 'h-1' } }));

    await acceptBid('bid-1', 'Welcome!');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3002/api/bids/bid-1/accept');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ notes: 'Welcome!' });
  });

  it('rejectBid sends POST /api/bids/:id/reject and surfaces ApiClientError', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'Forbidden' }, 403));

    const err = await rejectBid('bid-1').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect((err as ApiClientError).status).toBe(403);
  });
});
