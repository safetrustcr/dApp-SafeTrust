import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { getIdToken } = vi.hoisted(() => ({
  getIdToken: vi.fn(async () => 'token-hotel-manager'),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { getIdToken } },
}));

vi.mock('@/core/store/data', () => ({
  useGlobalAuthenticationStore: {
    getState: vi.fn(() => ({ token: null })),
  },
}));

import { createHotel, updateHotel, deleteHotel, HotelApiError } from './hotels';

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

describe('hotels API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('createHotel sends POST /api/hotels with X-Tenant-ID: hotel_industry and Bearer token', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        hotel: {
          id: 'hotel-uuid-1',
          name: 'Grand Hotel',
          address: 'Avenida 1',
        },
      }, 201),
    );

    const result = await createHotel({
      name: 'Grand Hotel',
      address: 'Avenida 1',
    });

    expect(result.id).toBe('hotel-uuid-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toContain('/api/hotels');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Tenant-ID']).toBe('hotel_industry');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers.Authorization).toBe('Bearer token-hotel-manager');
  });

  it('updateHotel sends PATCH /api/hotels/:id', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        hotel: {
          id: 'hotel-uuid-1',
          name: 'Grand Hotel Renovated',
          address: 'Avenida 1',
        },
      }, 200),
    );

    const result = await updateHotel('hotel-uuid-1', {
      name: 'Grand Hotel Renovated',
    });

    expect(result.name).toBe('Grand Hotel Renovated');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toContain('/api/hotels/hotel-uuid-1');
    expect(init.method).toBe('PATCH');
    expect(init.headers['X-Tenant-ID']).toBe('hotel_industry');
  });

  it('deleteHotel sends DELETE /api/hotels/:id', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ success: true, id: 'hotel-uuid-1' }, 200),
    );

    const result = await deleteHotel('hotel-uuid-1');
    expect(result).toEqual({ success: true, id: 'hotel-uuid-1' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toContain('/api/hotels/hotel-uuid-1');
    expect(init.method).toBe('DELETE');
    expect(init.headers['X-Tenant-ID']).toBe('hotel_industry');
  });

  it('throws HotelApiError with status 409 and code HOTEL_HAS_DEPENDENTS on dependent conflict', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          code: 'HOTEL_HAS_DEPENDENTS',
          error: "Remove this hotel's 3 rooms first",
          message: "Remove this hotel's 3 rooms first",
          roomsCount: 3,
        },
        409,
      ),
    );

    try {
      await deleteHotel('hotel-uuid-1');
      expect.unreachable('Should have thrown HotelApiError');
    } catch (error) {
      expect(error).toBeInstanceOf(HotelApiError);
      const apiError = error as HotelApiError;
      expect(apiError.status).toBe(409);
      expect(apiError.code).toBe('HOTEL_HAS_DEPENDENTS');
      expect(apiError.message).toBe("Remove this hotel's 3 rooms first");
    }
  });

  it('throws HotelApiError on 403 Forbidden', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          error: 'Forbidden',
          message: 'You do not have permission to manage this hotel',
        },
        403,
      ),
    );

    try {
      await updateHotel('other-hotel', { name: 'Hacked' });
      expect.unreachable('Should have thrown HotelApiError');
    } catch (error) {
      expect(error).toBeInstanceOf(HotelApiError);
      const apiError = error as HotelApiError;
      expect(apiError.status).toBe(403);
      expect(apiError.message).toBe('You do not have permission to manage this hotel');
    }
  });
});
