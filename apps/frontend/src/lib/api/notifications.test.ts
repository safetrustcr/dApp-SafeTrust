import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getIdToken } = vi.hoisted(() => ({ getIdToken: vi.fn(async () => 'token-abc') }));
vi.mock('@/lib/firebase', () => ({ auth: { currentUser: { getIdToken } } }));

import { fetchNotifications, notificationHref, toDashboardNotification, type ApiNotification } from './notifications';
import { ApiClientError } from './client';

const fetchMock = vi.fn();
const jsonResponse = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body });

const event: ApiNotification = {
  id: 'event:m1',
  kind: 'event',
  type: 'payment',
  message: 'Deposit of 100 USDC is locked in escrow.',
  timestamp: '2026-11-03T10:00:00.000Z',
  read: false,
  escrowId: 'escrow-1',
  apartmentId: 'apt-1',
  conversationId: 'conv-1',
  eventType: 'escrow_funded',
  txUrl: 'https://stellar.expert/explorer/testnet/tx/abc',
};

const action: ApiNotification = {
  id: 'action:escrow-1:fund',
  kind: 'pending_action',
  type: 'alert',
  message: 'Fund the escrow for Casa Azul to secure the deposit.',
  timestamp: '2026-11-02T10:00:00.000Z',
  read: false,
  escrowId: 'escrow-1',
  apartmentId: 'apt-1',
  conversationId: null,
  action: 'fund',
};

describe('notifications API client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('GETs /api/notifications with the Firebase token and maps the response', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ notifications: [action, event] }));
    const items = await fetchNotifications();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/notifications$/);
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer token-abc');
    expect(items.map((i) => i.id)).toEqual(['action:escrow-1:fund', 'event:m1']);
    expect(items[0]).toMatchObject({ kind: 'pending_action', action: 'fund', type: 'alert', escrowId: 'escrow-1' });
  });

  it('passes limit through', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ notifications: [] }));
    await fetchNotifications(20);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/api\/notifications\?limit=20$/);
  });

  it('returns an empty list when the user has nothing (no invented items)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ notifications: [] }));
    await expect(fetchNotifications()).resolves.toEqual([]);
    fetchMock.mockResolvedValue(jsonResponse({}));
    await expect(fetchNotifications()).resolves.toEqual([]);
  });

  it('surfaces API failures as ApiClientError', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Hasura is down' }, 502));
    await expect(fetchNotifications()).rejects.toMatchObject({ name: 'ApiClientError', status: 502, message: 'Hasura is down' });
    await expect(fetchNotifications()).rejects.toBeInstanceOf(ApiClientError);
  });
});

describe('notification links', () => {
  it('events open their conversation; pending actions open the escrow', () => {
    expect(notificationHref(event)).toBe('/dashboard/messages/conv-1');
    expect(notificationHref(action)).toBe('/escrow/apt-1/escrow/escrow-1');
  });

  it('falls back sensibly when ids are missing', () => {
    expect(notificationHref({ ...event, conversationId: null })).toBeUndefined();
    expect(notificationHref({ ...action, apartmentId: null })).toBe('/dashboard/escrow');
  });

  it('only keeps https transaction links', () => {
    expect(toDashboardNotification(event).txUrl).toBe(event.txUrl);
    expect(toDashboardNotification({ ...event, txUrl: 'javascript:alert(1)' }).txUrl).toBeUndefined();
    expect(toDashboardNotification({ ...event, txUrl: 'http://insecure.example' }).txUrl).toBeUndefined();
    expect(toDashboardNotification(action).txUrl).toBeUndefined();
  });
});
