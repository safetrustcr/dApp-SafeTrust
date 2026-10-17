import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hasura.js', () => ({
  hasuraRequest: vi.fn(),
}));

import { hasuraRequest } from '../hasura.js';
import {
  deleteDeviceTargets,
  listDeviceTargets,
  registerDevice,
  unregisterDevice,
} from '../push-devices-db.js';

const mockHasuraRequest = vi.mocked(hasuraRequest);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('push device persistence', () => {
  it('upserts ownership and prunes the least-recent devices beyond the ten newest', async () => {
    mockHasuraRequest
      .mockResolvedValueOnce({ insert_push_devices_one: { id: 'new' } })
      .mockResolvedValueOnce({ push_devices: [{ id: 'oldest' }, { id: 'older' }] })
      .mockResolvedValueOnce({ delete_push_devices: { affected_rows: 2 } });

    await registerDevice('user-b', 'opaque-target');

    expect(mockHasuraRequest.mock.calls[0][0]).toContain(
      'update_columns: [user_id, last_seen_at]',
    );
    expect(mockHasuraRequest.mock.calls[0][1]).toEqual({
      userId: 'user-b',
      fcmTarget: 'opaque-target',
    });
    expect(mockHasuraRequest.mock.calls[1][0]).toContain('order_by:');
    expect(mockHasuraRequest.mock.calls[1][1]).toEqual({ userId: 'user-b', offset: 10 });
    expect(mockHasuraRequest.mock.calls[2][0]).toContain('id: { _in: $ids }');
    expect(mockHasuraRequest.mock.calls[2][0]).toContain('user_id: { _eq: $userId }');
    expect(mockHasuraRequest.mock.calls[2][1]).toEqual({
      userId: 'user-b',
      ids: ['oldest', 'older'],
    });
  });

  it('does not issue a prune mutation when the user has at most ten devices', async () => {
    mockHasuraRequest
      .mockResolvedValueOnce({ insert_push_devices_one: { id: 'new' } })
      .mockResolvedValueOnce({ push_devices: [] });

    await registerDevice('user-a', 'target');

    expect(mockHasuraRequest).toHaveBeenCalledTimes(2);
  });

  it('scopes unregistration to both caller and target', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ delete_push_devices: { affected_rows: 0 } });

    await unregisterDevice('user-b', 'user-a-target');

    expect(mockHasuraRequest.mock.calls[0][0]).toContain(
      'user_id: { _eq: $userId }, fcm_target: { _eq: $fcmTarget }',
    );
    expect(mockHasuraRequest.mock.calls[0][1]).toEqual({
      userId: 'user-b',
      fcmTarget: 'user-a-target',
    });
  });

  it('lists device targets for one user only', async () => {
    const targets = [{ fcm_target: 'target', last_seen_at: '2026-10-17T00:00:00Z' }];
    mockHasuraRequest.mockResolvedValueOnce({ push_devices: targets });

    await expect(listDeviceTargets('user-a')).resolves.toEqual(targets);
    expect(mockHasuraRequest.mock.calls[0][0]).toContain('user_id: { _eq: $userId }');
    expect(mockHasuraRequest.mock.calls[0][1]).toEqual({ userId: 'user-a' });
  });

  it('scopes invalid target deletion to the requesting user', async () => {
    mockHasuraRequest.mockResolvedValueOnce({ delete_push_devices: { affected_rows: 1 } });

    await deleteDeviceTargets('user-a', ['invalid-target']);

    expect(mockHasuraRequest.mock.calls[0][0]).toContain(
      'user_id: { _eq: $userId }, fcm_target: { _in: $targets }',
    );
    expect(mockHasuraRequest.mock.calls[0][1]).toEqual({
      userId: 'user-a',
      targets: ['invalid-target'],
    });
  });

  it('does not issue a delete mutation for an empty target list', async () => {
    await deleteDeviceTargets('user-a', []);
    expect(mockHasuraRequest).not.toHaveBeenCalled();
  });
});
