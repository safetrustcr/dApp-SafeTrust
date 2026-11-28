import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import {
  DeviceUserProfileMissingError,
  registerDevice,
  unregisterDevice,
} from '../../services/push-devices-db.js';

type DeviceBody = {
  fcmTarget?: unknown;
  userId?: unknown;
};

type DeviceRequest = AuthenticatedRequest & { body: DeviceBody };

function validateBody(body: unknown): { fcmTarget: string } | { error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'INVALID_FCM_TARGET' };
  }

  const fields = body as DeviceBody;
  if (Object.prototype.hasOwnProperty.call(fields, 'userId')) {
    return { error: 'FORBIDDEN_FIELD' };
  }
  if (
    typeof fields.fcmTarget !== 'string' ||
    !fields.fcmTarget.trim() ||
    fields.fcmTarget.length > 4096
  ) {
    return { error: 'INVALID_FCM_TARGET' };
  }

  return { fcmTarget: fields.fcmTarget };
}

export async function registerDeviceHandler(
  req: DeviceRequest,
  res: Response,
): Promise<Response | void> {
  if (!req.user) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const validated = validateBody(req.body);
  if ('error' in validated) {
    return res.status(400).json({ error: validated.error });
  }

  const { uid } = req.user;
  try {
    await registerDevice(uid, validated.fcmTarget);
    console.info(`[notifications/devices] userId=${uid} outcome=registered`);
    return res.status(204).end();
  } catch (error) {
    if (error instanceof DeviceUserProfileMissingError) {
      console.info(`[notifications/devices] userId=${uid} outcome=profile-not-synced`);
      return res.status(409).json({ error: 'USER_PROFILE_NOT_SYNCED' });
    }
    console.error(`[notifications/devices] userId=${uid} outcome=register-failed`);
    return res.status(500).json({ error: 'Failed to register device' });
  }
}

export async function unregisterDeviceHandler(
  req: DeviceRequest,
  res: Response,
): Promise<Response | void> {
  if (!req.user) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const validated = validateBody(req.body);
  if ('error' in validated) {
    return res.status(400).json({ error: validated.error });
  }

  const { uid } = req.user;
  try {
    await unregisterDevice(uid, validated.fcmTarget);
    console.info(`[notifications/devices] userId=${uid} outcome=unregistered`);
    return res.status(204).end();
  } catch {
    console.error(`[notifications/devices] userId=${uid} outcome=unregister-failed`);
    return res.status(500).json({ error: 'Failed to unregister device' });
  }
}
