import { HasuraRequestError, hasuraRequest } from './hasura.js';

export type DeviceTarget = {
  fcm_target: string;
  last_seen_at: string;
};

export class DeviceUserProfileMissingError extends Error {
  constructor() {
    super('User profile must be synced before registering a push device');
    this.name = 'DeviceUserProfileMissingError';
  }
}

function isUserProfileForeignKeyViolation(error: unknown): boolean {
  if (!(error instanceof HasuraRequestError)) return false;

  return Boolean(
    error.details?.some((detail) => {
      const code = String(detail.extensions?.code ?? '').toLowerCase();
      return (
        code === 'foreign_key_violation' ||
        code === 'foreign-key-violation' ||
        (code === 'constraint-violation' &&
          /push_devices_user_id_fkey/i.test(detail.message))
      );
    }),
  );
}

export async function registerDevice(userId: string, fcmTarget: string): Promise<void> {
  const { users } = await hasuraRequest<{ users: { id: string }[] }>(
    `query CheckPushDeviceUser($userId: String!) {
      users(where: { id: { _eq: $userId } }, limit: 1) { id }
    }`,
    { userId },
  );
  if (!users.length) {
    throw new DeviceUserProfileMissingError();
  }

  try {
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
  } catch (error) {
    if (isUserProfileForeignKeyViolation(error)) {
      throw new DeviceUserProfileMissingError();
    }
    throw error;
  }
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
