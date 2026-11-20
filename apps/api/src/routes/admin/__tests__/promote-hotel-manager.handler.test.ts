import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../../../services/hotel-provisioning.js', () => ({
  promoteHotelUserToManager: vi.fn(),
}));

import { promoteHotelUserToManager } from '../../../services/hotel-provisioning.js';
import { promoteHotelManagerHandler } from '../promote-hotel-manager.handler.js';

const MANAGER = {
  id: 'hotel-1',
  email: 'manager@example.com',
  first_name: 'Grace',
  last_name: 'Hopper',
  phone_number: null,
  role: 'MANAGER',
  firebase_uid: 'uid-manager',
};

function mockRes() {
  const res: { statusCode: number; body: unknown } = { statusCode: 0, body: undefined };
  const api = {
    status(code: number) {
      res.statusCode = code;
      return api;
    },
    json(payload: unknown) {
      res.body = payload;
      return api;
    },
  };
  return { res, api };
}

function mockReq(body: Record<string, unknown>) {
  return { user: { uid: 'admin-uid' }, body } as unknown as Request;
}

describe('promoteHotelManagerHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(promoteHotelUserToManager).mockResolvedValue(MANAGER as never);
  });

  it('promotes the firebase uid in the body and returns the manager', async () => {
    const { res, api } = mockRes();

    await promoteHotelManagerHandler(
      mockReq({ firebaseUid: 'uid-manager' }) as never,
      api as unknown as Response,
    );

    expect(promoteHotelUserToManager).toHaveBeenCalledWith('uid-manager', 'admin-uid');
    expect(res.statusCode).toBe(200);
    expect((res.body as { promoted?: boolean }).promoted).toBe(true);
  });

  it('rejects a missing firebase uid', async () => {
    const { res, api } = mockRes();

    await promoteHotelManagerHandler(mockReq({}) as never, api as unknown as Response);

    expect(res.statusCode).toBe(400);
    expect(promoteHotelUserToManager).not.toHaveBeenCalled();
  });

  it('returns 404 when the user has never signed up', async () => {
    vi.mocked(promoteHotelUserToManager).mockRejectedValueOnce(
      Object.assign(new Error('Hotel user not found for this Firebase UID'), {
        status: 404,
        code: 'HOTEL_USER_NOT_FOUND',
      }),
    );
    const { res, api } = mockRes();

    await promoteHotelManagerHandler(
      mockReq({ firebaseUid: 'uid-missing' }) as never,
      api as unknown as Response,
    );

    expect(res.statusCode).toBe(404);
  });

  it('returns 500 on an unexpected failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(promoteHotelUserToManager).mockRejectedValueOnce(new Error('db down'));
    const { res, api } = mockRes();

    await promoteHotelManagerHandler(
      mockReq({ firebaseUid: 'uid-manager' }) as never,
      api as unknown as Response,
    );

    expect(res.statusCode).toBe(500);
  });
});
