import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../http/api-error.js';

vi.mock('../hasura.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../hasura.js')>();
  return {
    ...actual,
    hasuraRequest: vi.fn(),
  };
});

import { HasuraRequestError, hasuraRequest } from '../hasura.js';
import { createBidRequest, listApartmentBids, updateBidStatus } from '../bids-db.js';

const mockHasuraRequest = vi.mocked(hasuraRequest);

describe('bids-db service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps active bid unique/trigger errors to 409 ACTIVE_BID_EXISTS', async () => {
    mockHasuraRequest.mockRejectedValueOnce(
      new HasuraRequestError('Tenant already has an active bid'),
    );

    await expect(
      createBidRequest({
        apartmentId: '550e8400-e29b-41d4-a716-446655440001',
        tenantId: 'guest-1',
        proposedPrice: 1200,
        desiredMoveIn: '2026-12-01T00:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'ACTIVE_BID_EXISTS',
    });
  });

  it('formats tenant details in listApartmentBids', async () => {
    mockHasuraRequest.mockResolvedValueOnce({
      bid_requests: [
        {
          id: 'bid-1',
          apartment_id: 'apt-1',
          tenant_id: 'guest-1',
          current_status: 'PENDING',
          proposed_price: 1350,
          desired_move_in: '2026-12-01T00:00:00Z',
          created_at: '2026-11-25T10:00:00Z',
          updated_at: '2026-11-25T10:00:00Z',
          tenant: {
            id: 'guest-1',
            first_name: 'Maria',
            last_name: 'Lopez',
            phone_number: '88881234',
            country_code: '+506',
            user_wallets: [{ wallet_address: 'GABC123456789' }],
          },
        },
      ],
      bid_requests_aggregate: { aggregate: { count: 1 } },
    });

    const result = await listApartmentBids({
      apartmentId: 'apt-1',
      limit: 10,
      offset: 0,
    });

    expect(result.totalCount).toBe(1);
    expect(result.offers[0]).toMatchObject({
      id: 'bid-1',
      tenant_name: 'Maria Lopez',
      tenant_phone: '+506 88881234',
      tenant_wallet_address: 'GABC123456789',
      proposed_price: 1350,
      current_status: 'PENDING',
    });
  });

  it('updates bid status and inserts a status history row', async () => {
    const bid = {
      id: 'bid-1',
      apartment_id: 'apt-1',
      tenant_id: 'guest-1',
      current_status: 'APPROVED',
      proposed_price: 1350,
      desired_move_in: '2026-12-01T00:00:00Z',
      created_at: '2026-11-25T10:00:00Z',
      updated_at: '2026-11-25T10:05:00Z',
    };
    const history = {
      id: 'hist-1',
      bid_request_id: 'bid-1',
      status: 'APPROVED',
      notes: 'Accepted by host',
      changed_by: 'host-1',
      created_at: '2026-11-25T10:05:00Z',
    };

    mockHasuraRequest.mockResolvedValueOnce({
      update_bid_requests: { returning: [bid] },
      insert_bid_status_histories_one: history,
    });

    const result = await updateBidStatus({
      bidId: 'bid-1',
      nextStatus: 'APPROVED',
      allowedFromStatuses: ['PENDING', 'VIEWED'],
      actorId: 'host-1',
      notes: 'Accepted by host',
    });

    expect(mockHasuraRequest).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ bid, history });
  });

  it('throws 409 ApiError when update_bid_requests affects no rows', async () => {
    mockHasuraRequest.mockResolvedValueOnce({
      update_bid_requests: { returning: [] },
      insert_bid_status_histories_one: null,
    });

    await expect(
      updateBidStatus({
        bidId: 'bid-1',
        nextStatus: 'APPROVED',
        allowedFromStatuses: ['PENDING'],
        actorId: 'host-1',
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
