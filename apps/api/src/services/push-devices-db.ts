import { hasuraRequest } from './hasura.js';

export type DeviceTarget = {
  fcm_target: string;
  last_seen_at: string;
};

const MAX_DEVICES_PER_USER = 10;

export async function registerDevice(userId: string, fcmTarget: string): Promise<void> {
  await hasuraRequest<{
    insert_push_devices_one: { id: string } | null;
  }>(
    `mutation RegisterPushDevice($userId: String!, $fcmTarget: String!) {
      insert_push_devices_one(
        object: { user_id: $userId, fcm_target: $fcmTarget }
        on_conflict: {
          constraint: push_devices_fcm_target_key
          update_columns: [user_id, last_seen_at]
        }
      ) {
        id
      }
    }`,
    { userId, fcmTarget },
  );

  const { push_devices: devices } = await hasuraRequest<{
    push_devices: { id: string }[];
  }>(
    `query GetUserPushDevices($userId: String!, $offset: Int!) {
      push_devices(
        where: { user_id: { _eq: $userId } }
        order_by: [{ last_seen_at: desc }, { created_at: desc }, { id: desc }]
        offset: $offset
      ) {
        id
      }
    }`,
    { userId, offset: MAX_DEVICES_PER_USER },
  );

  if (devices.length === 0) {
    return;
  }

  await hasuraRequest<{
    delete_push_devices: { affected_rows: number };
  }>(
    `mutation PruneUserPushDevices($userId: String!, $ids: [uuid!]!) {
      delete_push_devices(
        where: { user_id: { _eq: $userId }, id: { _in: $ids } }
      ) {
        affected_rows
      }
    }`,
    { userId, ids: devices.map(({ id }) => id) },
  );
}

export async function unregisterDevice(userId: string, fcmTarget: string): Promise<void> {
  await hasuraRequest<{
    delete_push_devices: { affected_rows: number };
  }>(
    `mutation UnregisterPushDevice($userId: String!, $fcmTarget: String!) {
      delete_push_devices(
        where: { user_id: { _eq: $userId }, fcm_target: { _eq: $fcmTarget } }
      ) {
        affected_rows
      }
    }`,
    { userId, fcmTarget },
  );
}

export async function listDeviceTargets(userId: string): Promise<DeviceTarget[]> {
  const { push_devices } = await hasuraRequest<{ push_devices: DeviceTarget[] }>(
    `query ListPushDeviceTargets($userId: String!) {
      push_devices(where: { user_id: { _eq: $userId } }) {
        fcm_target
        last_seen_at
      }
    }`,
    { userId },
  );
  return push_devices;
}

export async function deleteDeviceTargets(userId: string, targets: string[]): Promise<void> {
  if (targets.length === 0) {
    return;
  }

  await hasuraRequest<{
    delete_push_devices: { affected_rows: number };
  }>(
    `mutation DeleteInvalidPushDeviceTargets($userId: String!, $targets: [String!]!) {
      delete_push_devices(
        where: { user_id: { _eq: $userId }, fcm_target: { _in: $targets } }
      ) {
        affected_rows
      }
    }`,
    { userId, targets },
  );
}
