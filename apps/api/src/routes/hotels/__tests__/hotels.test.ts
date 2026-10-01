import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/hasura.js', () => ({
  hasuraRequest: vi.fn(),
  HasuraRequestError: class extends Error {
    details?: Array<{ message: string; extensions?: { code?: string } }>;
    constructor(message: string, details?: Array<{ message: string; extensions?: { code?: string } }>) {
      super(message);
      this.name = 'HasuraRequestError';
      this.details = details;
    }
  },
}));

import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.middleware.js';
import { hasuraRequest, HasuraRequestError } from '../../../services/hasura.js';
import { createHotelHandler } from '../create-hotel.handler.js';
import { updateHotelHandler } from '../update-hotel.handler.js';
import { deleteHotelHandler } from '../delete-hotel.handler.js';

const mockHasuraRequest = vi.mocked(hasuraRequest);

function mockRes() {
  const res = {
    _status: 200 as number,
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
  return res as unknown as Response & { _status: number; _body: any };
}

function mockReq(options: {
  uid?: string;
  email?: string;
  role?: string;
  body?: any;
  params?: any;
  tenant?: string;
} = {}): AuthenticatedRequest {
  return {
    user: {
      uid: options.uid ?? 'firebase-uid-manager-1',
      email: options.email ?? 'manager1@example.com',
      role: options.role ?? 'guest',
    },
    body: options.body ?? {},
    params: options.params ?? {},
    tenant: (options.tenant ?? 'hotel_industry') as any,
  } as AuthenticatedRequest;
}

const MOCK_MANAGER_USER = {
  id: 'user-uuid-manager-1',
  email: 'manager1@example.com',
  role: 'MANAGER',
  firebase_uid: 'firebase-uid-manager-1',
};

const MOCK_OTHER_MANAGER_USER = {
  id: 'user-uuid-manager-2',
  email: 'manager2@example.com',
  role: 'MANAGER',
  firebase_uid: 'firebase-uid-manager-2',
};

const MOCK_GUEST_USER = {
  id: 'user-uuid-guest',
  email: 'guest@example.com',
  role: 'GUEST',
  firebase_uid: 'firebase-uid-guest',
};

const MOCK_HOTEL_1 = {
  id: 'hotel-uuid-1',
  name: 'Hotel San Jose',
  address: 'Calle 1, Avenida Central',
  description: 'Nice hotel',
  location_area: 'San Jose',
  coordinates: {
    type: 'Point' as const,
    coordinates: [-84.0907, 9.9281] as [number, number], // GeoJSON: [lng, lat]
  },
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  owner_user_id: 'user-uuid-manager-1',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/hotels (createHotelHandler)', () => {
  it('allows a MANAGER to create their own hotel with coordinates', async () => {
    // 1. isPlatformAdmin check -> not admin
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    // 2. findHotelUserByFirebaseUidOrEmail -> returns MANAGER user
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_MANAGER_USER] });
    // 3. insert_hotels_one -> creates hotel
    mockHasuraRequest.mockResolvedValueOnce({
      insert_hotels_one: {
        ...MOCK_HOTEL_1,
        id: 'hotel-uuid-new',
      },
    });

    const req = mockReq({
      uid: 'firebase-uid-manager-1',
      body: {
        name: 'Hotel San Jose',
        address: 'Calle 1, Avenida Central',
        description: 'Nice hotel',
        locationArea: 'San Jose',
        latitude: 9.9281,
        longitude: -84.0907,
      },
    });
    const res = mockRes();

    await createHotelHandler(req, res);

    expect(res._status).toBe(201);
    expect(res._body.hotel.id).toBe('hotel-uuid-new');
    expect(res._body.hotel.name).toBe('Hotel San Jose');
    expect(res._body.hotel.latitude).toBe(9.9281);
    expect(res._body.hotel.longitude).toBe(-84.0907);

    // Verify insert object passed to Hasura
    const insertCall = mockHasuraRequest.mock.calls[2];
    expect(insertCall[1]).toEqual({
      object: {
        name: 'Hotel San Jose',
        address: 'Calle 1, Avenida Central',
        description: 'Nice hotel',
        location_area: 'San Jose',
        coordinates: {
          type: 'Point',
          coordinates: [-84.0907, 9.9281], // GeoJSON: [lng, lat]
        },
        owner_user_id: 'user-uuid-manager-1',
      },
    });
  });

  it('allows a platform admin to pass custom ownerUserId', async () => {
    // 1. isPlatformAdmin -> returns admin role
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [{ role: { name: 'admin' } }] });
    // 2. findHotelUserByFirebaseUidOrEmail
    mockHasuraRequest.mockResolvedValueOnce({ users: [] });
    // 3. insert_hotels_one
    mockHasuraRequest.mockResolvedValueOnce({
      insert_hotels_one: {
        ...MOCK_HOTEL_1,
        owner_user_id: 'custom-manager-uuid',
      },
    });

    const req = mockReq({
      uid: 'admin-uid',
      body: {
        name: 'Admin Managed Hotel',
        address: 'Calle 10',
        ownerUserId: 'custom-manager-uuid',
      },
    });
    const res = mockRes();

    await createHotelHandler(req, res);

    expect(res._status).toBe(201);
    const insertCall = mockHasuraRequest.mock.calls[2] as any;
    expect(insertCall[1].object.owner_user_id).toBe('custom-manager-uuid');
  });

  it('rejects GUEST users with 403 Forbidden', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] }); // not admin
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_GUEST_USER] }); // GUEST role

    const req = mockReq({
      uid: 'firebase-uid-guest',
      body: { name: 'Hotel California', address: 'Street 1' },
    });
    const res = mockRes();

    await createHotelHandler(req, res);

    expect(res._status).toBe(403);
    expect(res._body.error).toBe('Forbidden');
  });

  it('rejects STAFF users with 403 Forbidden', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    mockHasuraRequest.mockResolvedValueOnce({ users: [{ ...MOCK_GUEST_USER, role: 'STAFF' }] });

    const req = mockReq({
      uid: 'firebase-uid-staff',
      body: { name: 'Hotel California', address: 'Street 1' },
    });
    const res = mockRes();

    await createHotelHandler(req, res);

    expect(res._status).toBe(403);
    expect(res._body.error).toBe('Forbidden');
  });

  it('rejects empty name with 400', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_MANAGER_USER] });

    const req = mockReq({
      body: { name: '   ', address: 'Avenida 1' },
    });
    const res = mockRes();

    await createHotelHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._body.error).toBe('Hotel name is required');
  });

  it('rejects name too long (> 100 characters) with 400', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_MANAGER_USER] });

    const req = mockReq({
      body: { name: 'A'.repeat(101), address: 'Avenida 1' },
    });
    const res = mockRes();

    await createHotelHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._body.error).toBe('Hotel name must be between 1 and 100 characters');
  });

  it('rejects latitude 95 with 400', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_MANAGER_USER] });

    const req = mockReq({
      body: { name: 'Hotel California', address: 'Avenida 1', latitude: 95, longitude: -84 },
    });
    const res = mockRes();

    await createHotelHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._body.error).toBe('Latitude must be between -90 and 90');
  });

  it('rejects only one coordinate with 400', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_MANAGER_USER] });

    const req = mockReq({
      body: { name: 'Hotel California', address: 'Avenida 1', latitude: 9.9281 },
    });
    const res = mockRes();

    await createHotelHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._body.error).toBe('Both latitude and longitude must be provided together');
  });

  it('saves null coordinates when left blank or untouched', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_MANAGER_USER] });
    mockHasuraRequest.mockResolvedValueOnce({
      insert_hotels_one: {
        ...MOCK_HOTEL_1,
        coordinates: null,
      },
    });

    const req = mockReq({
      body: { name: 'Hotel California', address: 'Avenida 1', latitude: '', longitude: '' },
    });
    const res = mockRes();

    await createHotelHandler(req, res);

    expect(res._status).toBe(201);
    const insertCall = mockHasuraRequest.mock.calls[2] as any;
    expect(insertCall[1].object.coordinates).toBeNull();
  });
});

describe('PATCH /api/hotels/:id (updateHotelHandler)', () => {
  it('allows the owning MANAGER to update allowed fields', async () => {
    // 1. getHotelById
    mockHasuraRequest.mockResolvedValueOnce({ hotels_by_pk: MOCK_HOTEL_1 });
    // 2. isPlatformAdmin
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    // 3. findHotelUserByFirebaseUidOrEmail
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_MANAGER_USER] });
    // 4. update_hotels_by_pk
    mockHasuraRequest.mockResolvedValueOnce({
      update_hotels_by_pk: {
        ...MOCK_HOTEL_1,
        name: 'Hotel San Jose Renovated',
        updated_at: '2026-09-30T01:00:00Z',
      },
    });

    const req = mockReq({
      params: { id: 'hotel-uuid-1' },
      body: { name: 'Hotel San Jose Renovated' },
    });
    const res = mockRes();

    await updateHotelHandler(req, res);

    expect(res._status).toBe(200);
    expect(res._body.hotel.name).toBe('Hotel San Jose Renovated');
    expect(res._body.hotel.updated_at).toBe('2026-09-30T01:00:00Z');

    // Verify updated_at was NOT passed in the update _set
    const updateCall = mockHasuraRequest.mock.calls[3] as any;
    expect(updateCall[1].set).toEqual({ name: 'Hotel San Jose Renovated' });
    expect(updateCall[1].set.updated_at).toBeUndefined();
  });

  it('rejects a manager trying to edit another manager hotel with 403', async () => {
    // getHotelById -> owned by user-uuid-manager-1
    mockHasuraRequest.mockResolvedValueOnce({ hotels_by_pk: MOCK_HOTEL_1 });
    // isPlatformAdmin
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    // findHotelUserByFirebaseUidOrEmail -> returns manager-2
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_OTHER_MANAGER_USER] });

    const req = mockReq({
      uid: 'firebase-uid-manager-2',
      params: { id: 'hotel-uuid-1' },
      body: { name: 'Hacked Hotel' },
    });
    const res = mockRes();

    await updateHotelHandler(req, res);

    expect(res._status).toBe(403);
    expect(res._body.message).toBe('You do not have permission to manage this hotel');
  });

  it('returns 404 if hotel does not exist', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ hotels_by_pk: null });

    const req = mockReq({
      params: { id: 'non-existent-hotel' },
      body: { name: 'Test' },
    });
    const res = mockRes();

    await updateHotelHandler(req, res);

    expect(res._status).toBe(404);
    expect(res._body.error).toBe('Hotel not found');
  });
});

describe('DELETE /api/hotels/:id (deleteHotelHandler)', () => {
  it('blocks deletion with 409 if hotel has rooms', async () => {
    // 1. getHotelById
    mockHasuraRequest.mockResolvedValueOnce({ hotels_by_pk: MOCK_HOTEL_1 });
    // 2. isPlatformAdmin
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    // 3. findHotelUserByFirebaseUidOrEmail
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_MANAGER_USER] });
    // 4. getHotelDependents -> 3 rooms, 0 reservations
    mockHasuraRequest.mockResolvedValueOnce({
      rooms_aggregate: { aggregate: { count: 3 } },
      reservations_aggregate: { aggregate: { count: 0 } },
    });

    const req = mockReq({
      params: { id: 'hotel-uuid-1' },
    });
    const res = mockRes();

    await deleteHotelHandler(req, res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('HOTEL_HAS_DEPENDENTS');
    expect(res._body.message).toBe("Remove this hotel's 3 rooms first");
    expect(res._body.roomsCount).toBe(3);

    // Verify delete mutation was NEVER called
    expect(mockHasuraRequest).toHaveBeenCalledTimes(4);
  });

  it('blocks deletion with 409 if hotel has reservations', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ hotels_by_pk: MOCK_HOTEL_1 });
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_MANAGER_USER] });
    mockHasuraRequest.mockResolvedValueOnce({
      rooms_aggregate: { aggregate: { count: 0 } },
      reservations_aggregate: { aggregate: { count: 2 } },
    });

    const req = mockReq({
      params: { id: 'hotel-uuid-1' },
    });
    const res = mockRes();

    await deleteHotelHandler(req, res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('HOTEL_HAS_DEPENDENTS');
    expect(res._body.message).toBe("Remove this hotel's 2 reservations first");
  });

  it('allows owning MANAGER to delete hotel with 0 rooms and 0 reservations', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ hotels_by_pk: MOCK_HOTEL_1 });
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_MANAGER_USER] });
    // getHotelDependents -> 0 and 0
    mockHasuraRequest.mockResolvedValueOnce({
      rooms_aggregate: { aggregate: { count: 0 } },
      reservations_aggregate: { aggregate: { count: 0 } },
    });
    // delete_hotels_by_pk
    mockHasuraRequest.mockResolvedValueOnce({
      delete_hotels_by_pk: { id: 'hotel-uuid-1' },
    });

    const req = mockReq({
      params: { id: 'hotel-uuid-1' },
    });
    const res = mockRes();

    await deleteHotelHandler(req, res);

    expect(res._status).toBe(200);
    expect(res._body).toEqual({ success: true, id: 'hotel-uuid-1' });
  });

  it('rejects a manager trying to delete another manager hotel with 403', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ hotels_by_pk: MOCK_HOTEL_1 });
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_OTHER_MANAGER_USER] });

    const req = mockReq({
      uid: 'firebase-uid-manager-2',
      params: { id: 'hotel-uuid-1' },
    });
    const res = mockRes();

    await deleteHotelHandler(req, res);

    expect(res._status).toBe(403);
    expect(res._body.message).toBe('You do not have permission to manage this hotel');
  });

  it('maps unexpected database foreign key violations to 409 HOTEL_HAS_DEPENDENTS', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ hotels_by_pk: MOCK_HOTEL_1 });
    mockHasuraRequest.mockResolvedValueOnce({ user_roles: [] });
    mockHasuraRequest.mockResolvedValueOnce({ users: [MOCK_MANAGER_USER] });
    mockHasuraRequest.mockResolvedValueOnce({
      rooms_aggregate: { aggregate: { count: 0 } },
      reservations_aggregate: { aggregate: { count: 0 } },
    });
    mockHasuraRequest.mockRejectedValueOnce(
      new HasuraRequestError('foreign key constraint "rooms_hotel_id_fkey" violated', [
        { message: 'violates foreign key constraint', extensions: { code: 'foreign_key_violation' } },
      ]),
    );

    const req = mockReq({
      params: { id: 'hotel-uuid-1' },
    });
    const res = mockRes();

    await deleteHotelHandler(req, res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('HOTEL_HAS_DEPENDENTS');
  });
});
