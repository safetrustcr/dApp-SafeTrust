import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendEachForMulticast, listDeviceTargets, deleteDeviceTargets } = vi.hoisted(() => ({
  sendEachForMulticast: vi.fn(),
  listDeviceTargets: vi.fn(),
  deleteDeviceTargets: vi.fn(),
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({ sendEachForMulticast }),
}));
vi.mock('../push-devices-db.js', () => ({
  listDeviceTargets,
  deleteDeviceTargets,
}));

import { notifyUser } from '../push-notifications.js';

const payload = {
  title: 'New message',
  body: 'A sender sent you a message',
  url: '/dashboard/messages/conversation-1',
  tag: 'conversation:conversation-1',
  type: 'message',
};

describe('notifyUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PUSH_NOTIFICATIONS_ENABLED = 'true';
    process.env.APP_PUBLIC_URL = 'https://app.safetrust.example';
    listDeviceTargets.mockResolvedValue([]);
    sendEachForMulticast.mockResolvedValue({
      successCount: 0,
      failureCount: 0,
      responses: [],
    });
  });

  it('does nothing when push notifications are disabled', async () => {
    process.env.PUSH_NOTIFICATIONS_ENABLED = 'false';

    await expect(notifyUser('user-1', payload)).resolves.toBeUndefined();

    expect(listDeviceTargets).not.toHaveBeenCalled();
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('sends one privacy-safe multicast with a click-through link and skips stale devices', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    listDeviceTargets.mockResolvedValue([
      { fcm_target: 'active-private-token', last_seen_at: new Date().toISOString() },
      { fcm_target: 'stale-private-token', last_seen_at: '2020-01-01T00:00:00.000Z' },
    ]);
    sendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }],
    });

    await notifyUser('user-1', payload);

    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ['active-private-token'],
      notification: { title: payload.title, body: payload.body },
      webpush: {
        notification: { tag: payload.tag },
        fcmOptions: { link: 'https://app.safetrust.example/dashboard/messages/conversation-1' },
      },
      data: { url: payload.url, type: 'message' },
    });
    const logged = JSON.stringify([info.mock.calls, warn.mock.calls]);
    expect(logged).not.toContain('private-token');
    expect(logged).not.toContain(payload.body);
    info.mockRestore();
    warn.mockRestore();
  });

  it('deletes invalid registration tokens but retains other failed targets', async () => {
    listDeviceTargets.mockResolvedValue([
      { fcm_target: 'invalid-token', last_seen_at: new Date().toISOString() },
      { fcm_target: 'invalid-target-token', last_seen_at: new Date().toISOString() },
      { fcm_target: 'temporary-token', last_seen_at: new Date().toISOString() },
    ]);
    sendEachForMulticast.mockResolvedValue({
      successCount: 0,
      failureCount: 2,
      responses: [
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
        {
          success: false,
          error: { code: 'messaging/invalid-registration-token' },
        },
        { success: false, error: { code: 'messaging/server-unavailable' } },
      ],
    });

    await notifyUser('user-1', payload);

    expect(deleteDeviceTargets).toHaveBeenCalledWith('user-1', [
      'invalid-token',
      'invalid-target-token',
    ]);
  });

  it('swallows FCM errors and logs counts without exposing payload or targets', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    listDeviceTargets.mockResolvedValue([
      { fcm_target: 'private-token', last_seen_at: new Date().toISOString() },
    ]);
    sendEachForMulticast.mockRejectedValue(new Error('private message body'));

    await expect(notifyUser('user-1', payload)).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith('[push] delivery failed', {
      userId: 'user-1',
      successCount: 0,
      failureCount: 1,
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-token');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private message body');
    warn.mockRestore();
  });

  it('does not send when the click-through base URL is not HTTPS', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.APP_PUBLIC_URL = 'http://app.safetrust.example';
    listDeviceTargets.mockResolvedValue([
      { fcm_target: 'private-token', last_seen_at: new Date().toISOString() },
    ]);

    await expect(notifyUser('user-1', payload)).resolves.toBeUndefined();

    expect(sendEachForMulticast).not.toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private-token');
    warn.mockRestore();
  });
});
