import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../../middleware/auth.middleware.js';

vi.mock('../../../services/push-devices-db.js', () => ({
  DeviceUserProfileMissingError: class DeviceUserProfileMissingError extends Error {},
  registerDevice: vi.fn(),
  unregisterDevice: vi.fn(),
}));

import {
  DeviceUserProfileMissingError,
  registerDevice,
  unregisterDevice,
} from '../../../services/push-devices-db.js';
import { registerDeviceHandler, unregisterDeviceHandler } from '../devices.handler.js';

const mockRegisterDevice = vi.mocked(registerDevice);
const mockUnregisterDevice = vi.mocked(unregisterDevice);

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
    end() {
      return this;
    },
  };
  return res as unknown as Response & { _status: number | null; _body: unknown };
}

function mockReq(body: unknown, uid = 'verified-user') {
  return { body, user: { uid } } as AuthenticatedRequest & { body: never };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('push device handlers', () => {
  it('registers the device for the authenticated uid and returns 204', async () => {
    const res = mockRes();

    await registerDeviceHandler(mockReq({ fcmTarget: 'opaque-target' }), res);

    expect(mockRegisterDevice).toHaveBeenCalledWith('verified-user', 'opaque-target');
    expect(res._status).toBe(204);
  });

  it('rejects a userId in the request body', async () => {
    const res = mockRes();

    await registerDeviceHandler(mockReq({ fcmTarget: 'target', userId: 'attacker' }), res);

    expect(res._status).toBe(400);
    expect(res._body).toEqual({ error: 'FORBIDDEN_FIELD' });
    expect(mockRegisterDevice).not.toHaveBeenCalled();
  });

  it.each([undefined, null, '', '  ', 42, 'x'.repeat(4097)])(
    'rejects an invalid target',
    async (fcmTarget) => {
      const res = mockRes();

      await registerDeviceHandler(mockReq({ fcmTarget }), res);

      expect(res._status).toBe(400);
      expect(res._body).toEqual({ error: 'INVALID_FCM_TARGET' });
      expect(mockRegisterDevice).not.toHaveBeenCalled();
    },
  );

  it('unregisters only for the authenticated uid and returns 204 when no row matched', async () => {
    const res = mockRes();

    await unregisterDeviceHandler(mockReq({ fcmTarget: 'opaque-target' }), res);

    expect(mockUnregisterDevice).toHaveBeenCalledWith('verified-user', 'opaque-target');
    expect(res._status).toBe(204);
  });

  it('rejects userId on unregistration too', async () => {
    const res = mockRes();

    await unregisterDeviceHandler(mockReq({ fcmTarget: 'target', userId: 'attacker' }), res);

    expect(res._status).toBe(400);
    expect(res._body).toEqual({ error: 'FORBIDDEN_FIELD' });
    expect(mockUnregisterDevice).not.toHaveBeenCalled();
  });

  it('returns a generic error without logging or exposing the target when persistence fails', async () => {
    const target = 'secret-fcm-target';
    const res = mockRes();
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRegisterDevice.mockRejectedValueOnce(new Error(`failed for ${target}`));

    await registerDeviceHandler(mockReq({ fcmTarget: target }), res);

    expect(res._status).toBe(500);
    expect(res._body).toEqual({ error: 'Failed to register device' });
    expect(logSpy).toHaveBeenCalledWith(
      '[notifications/devices] userId=verified-user outcome=register-failed',
    );
    expect(logSpy.mock.calls.flat().join(' ')).not.toContain(target);
    logSpy.mockRestore();
  });

  it('returns a controlled response when the authenticated user profile is not synced', async () => {
    const res = mockRes();
    const logSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    mockRegisterDevice.mockRejectedValueOnce(new DeviceUserProfileMissingError());

    await registerDeviceHandler(mockReq({ fcmTarget: 'opaque-target' }), res);

    expect(res._status).toBe(409);
    expect(res._body).toEqual({ error: 'USER_PROFILE_NOT_SYNCED' });
    expect(logSpy).toHaveBeenCalledWith(
      '[notifications/devices] userId=verified-user outcome=profile-not-synced',
    );
    logSpy.mockRestore();
  });
});
