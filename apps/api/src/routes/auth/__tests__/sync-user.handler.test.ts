import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('firebase-admin/auth', () => ({ getAuth: vi.fn() }));
vi.mock('../../../services/user-provisioning.js', () => ({
  ensureUserRole: vi.fn(),
  syncUserProfile: vi.fn(),
}));
vi.mock('../../../services/hotel-provisioning.js', () => ({
  ensureHotelUser: vi.fn(),
}));

import { getAuth } from 'firebase-admin/auth';
import { ensureUserRole, syncUserProfile } from '../../../services/user-provisioning.js';
import { ensureHotelUser } from '../../../services/hotel-provisioning.js';
import { syncUserHandler } from '../sync-user.handler.js';

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

function mockReq(body: Record<string, unknown> = {}) {
  return {
    headers: { authorization: 'Bearer token-1' },
    body,
  } as unknown as Request;
}

describe('syncUserHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({
        uid: 'uid-1',
        email: 'guest@example.com',
        name: 'Ada Lovelace',
      }),
    } as never);
    vi.mocked(syncUserProfile).mockResolvedValue({ id: 'uid-1' } as never);
    vi.mocked(ensureUserRole).mockResolvedValue(undefined as never);
    vi.mocked(ensureHotelUser).mockResolvedValue({ id: 'hotel-1', role: 'GUEST' } as never);
  });

  it('mirrors the new public user into the hotel tenant as a guest', async () => {
    const { res, api } = mockRes();
    await syncUserHandler(mockReq({ phone_number: '+1 555 0100' }), api as unknown as Response);

    expect(res.statusCode).toBe(200);
    expect(ensureHotelUser).toHaveBeenCalledWith({
      firebaseUid: 'uid-1',
      email: 'guest@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneNumber: '+1 555 0100',
    });
  });

  it('still succeeds when the hotel tenant mirror fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(ensureHotelUser).mockRejectedValueOnce(new Error('tenant down'));
    const { res, api } = mockRes();

    await syncUserHandler(mockReq(), api as unknown as Response);

    expect(res.statusCode).toBe(200);
    expect((res.body as { success?: boolean }).success).toBe(true);
  });
});
