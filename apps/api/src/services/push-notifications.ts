import { getMessaging } from 'firebase-admin/messaging';
import { deleteDeviceTargets, listDeviceTargets } from './push-devices-db.js';

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  type?: string;
};

const INACTIVE_DEVICE_AGE_MS = 60 * 24 * 60 * 60 * 1000;
const INVALID_TARGET_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

function clickThroughLink(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('Push notification URL must be an application path');
  }

  const publicUrl = process.env.APP_PUBLIC_URL;
  if (!publicUrl) {
    throw new Error('APP_PUBLIC_URL is required for push notifications');
  }

  const base = new URL(publicUrl);
  if (base.protocol !== 'https:' || base.username || base.password) {
    throw new Error('APP_PUBLIC_URL must be an absolute HTTPS URL');
  }
  return new URL(path, base.origin).toString();
}

/** Best-effort delivery; FCM failures never affect the underlying database write. */
export async function notifyUser(userId: string, payload: PushPayload): Promise<void> {
  if (process.env.PUSH_NOTIFICATIONS_ENABLED !== 'true') return;

  let targets: Awaited<ReturnType<typeof listDeviceTargets>> = [];
  try {
    targets = await listDeviceTargets(userId);
    const cutoff = Date.now() - INACTIVE_DEVICE_AGE_MS;
    const activeTargets = targets.filter((target) => new Date(target.last_seen_at).getTime() >= cutoff);
    if (!activeTargets.length) {
      console.info('[push] delivery complete', { userId, successCount: 0, failureCount: 0 });
      return;
    }

    const response = await getMessaging().sendEachForMulticast({
      tokens: activeTargets.map(({ fcm_target }) => fcm_target),
      notification: { title: payload.title, body: payload.body },
      webpush: {
        notification: { tag: payload.tag },
        fcmOptions: { link: clickThroughLink(payload.url) },
      },
      data: { url: payload.url, type: payload.type ?? 'notification' },
    });

    const invalidTargets = response.responses.flatMap((result, index) =>
      !result.success && result.error && INVALID_TARGET_CODES.has(result.error.code)
        ? [activeTargets[index].fcm_target]
        : [],
    );
    if (invalidTargets.length) {
      try {
        await deleteDeviceTargets(userId, invalidTargets);
      } catch {
        console.warn('[push] invalid target cleanup failed', { userId, count: invalidTargets.length });
      }
    }

    console.info('[push] delivery complete', {
      userId,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch {
    console.warn('[push] delivery failed', {
      userId,
      successCount: 0,
      failureCount: targets.length,
    });
  }
}
