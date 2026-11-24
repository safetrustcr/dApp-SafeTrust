import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../hasura.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../hasura.js')>(),
  hasuraRequest: vi.fn(),
}));

import { HasuraRequestError, hasuraRequest } from '../hasura.js';
import {
  deleteDeviceTargets,
  DeviceUserProfileMissingError,
  listDeviceTargets,
  registerDevice,
  unregisterDevice,
} from '../push-devices-db.js';

const mockHasuraRequest = vi.mocked(hasuraRequest);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('push device persistence', () => {
  it('checks for a synced user and upserts device ownership in one mutation', async () => {
    mockHasuraRequest
      .mockResolvedValueOnce({ users: [{ id: 'user-b' }] })
      .mockResolvedValueOnce({ insert_push_devices_one: { id: 'new' } });

    await registerDevice('user-b', 'opaque-target');

    expect(mockHasuraRequest.mock.calls[0][0]).toContain('query CheckPushDeviceUser');
    expect(mockHasuraRequest.mock.calls[0][1]).toEqual({ userId: 'user-b' });
    expect(mockHasuraRequest.mock.calls[1][0]).toContain(
      'update_columns: [user_id, last_seen_at]',
    );
    expect(mockHasuraRequest.mock.calls[1][1]).toEqual({
      userId: 'user-b',
      fcmTarget: 'opaque-target',
    });
    expect(mockHasuraRequest).toHaveBeenCalledTimes(2);
  });

  it('returns a controlled profile-not-synced error without attempting registration', async () => {
    mockHasuraRequest
      .mockResolvedValueOnce({ users: [] });

    await expect(registerDevice('user-a', 'target')).rejects.toBeInstanceOf(
      DeviceUserProfileMissingError,
    );

    expect(mockHasuraRequest).toHaveBeenCalledTimes(1);
  });

  it('maps a profile foreign-key race to the controlled profile-not-synced error', async () => {
    mockHasuraRequest
      .mockResolvedValueOnce({ users: [{ id: 'user-a' }] })
      .mockRejectedValueOnce(new HasuraRequestError(
        'foreign key violation',
        [{
          message: 'push_devices_user_id_fkey',
          extensions: { code: 'constraint-violation' },
        }],
      ));

    await expect(registerDevice('user-a', 'target')).rejects.toBeInstanceOf(
      DeviceUserProfileMissingError,
    );
  });

  it('serializes the device cap with the database write rather than racing a separate prune', async () => {
    mockHasuraRequest
      .mockResolvedValueOnce({ users: [{ id: 'user-a' }] })
      .mockResolvedValueOnce({ insert_push_devices_one: { id: 'new' } });

    await registerDevice('user-a', 'target');

    const operations = mockHasuraRequest.mock.calls.map(([query]) => query);
    expect(operations.some((query) => query.includes('GetUserPushDevices'))).toBe(false);
    expect(operations.some((query) => query.includes('PruneUserPushDevices'))).toBe(false);
    expect(operations.filter((query) => query.includes('mutation RegisterPushDevice'))).toHaveLength(1);
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
