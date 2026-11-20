import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/hasura.js', () => ({ executeGraphQL: vi.fn() }));
vi.mock('../hasura-claims.js', () => ({ syncHasuraClaims: vi.fn() }));

import { executeGraphQL } from '../../lib/hasura.js';
import { syncHasuraClaims } from '../hasura-claims.js';
import {
  ensureHotelUser,
  promoteHotelUserToManager,
  syncHotelWallet,
} from '../hotel-provisioning.js';

const USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'guest@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  phone_number: null,
  role: 'GUEST' as const,
  firebase_uid: 'uid-1',
};

const ADDRESS = `G${'A'.repeat(55)}`;

function hotelQueryCalls() {
  return vi.mocked(executeGraphQL).mock.calls.map(([query]) => String(query));
}

describe('ensureHotelUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a GUEST row when neither firebase_uid nor email matches', async () => {
    vi.mocked(executeGraphQL)
      .mockResolvedValueOnce({ hotel_users: [] } as never)
      .mockResolvedValueOnce({ hotel_users: [] } as never)
      .mockResolvedValueOnce({ insert_hotel_users_one: USER } as never);

    const created = await ensureHotelUser({
      firebaseUid: 'uid-1',
      email: 'guest@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });

    expect(created).toEqual(USER);
    const insertCall = vi.mocked(executeGraphQL).mock.calls.find(([query]) =>
      String(query).includes('insert_hotel_users_one'),
    );
    expect(insertCall?.[1]).toMatchObject({
      object: { firebase_uid: 'uid-1', email: 'guest@example.com', role: 'GUEST' },
    });
  });

  it('matches by firebase_uid and updates without touching the role', async () => {
    vi.mocked(executeGraphQL)
      .mockResolvedValueOnce({ hotel_users: [USER] } as never)
      .mockResolvedValueOnce({ update_hotel_users_by_pk: USER } as never);

    await ensureHotelUser({ firebaseUid: 'uid-1', email: 'guest@example.com' });

    const queries = hotelQueryCalls();
    expect(queries.some((q) => q.includes('insert_hotel_users_one'))).toBe(false);
    const update = vi.mocked(executeGraphQL).mock.calls.find(([query]) =>
      String(query).includes('update_hotel_users_by_pk'),
    );
    expect(update?.[1]).toMatchObject({
      set: { firebase_uid: 'uid-1', email: 'guest@example.com' },
    });
    expect(update?.[1]).not.toMatchObject({ set: { role: expect.anything() } });
  });

  it('links a seeded MANAGER row by email on first sign-in, preserving MANAGER', async () => {
    const seeded = { ...USER, id: 'seed-1', role: 'MANAGER' as const, firebase_uid: null };
    const linkedRow = { ...seeded, firebase_uid: 'uid-1' };
    vi.mocked(executeGraphQL)
      .mockResolvedValueOnce({ hotel_users: [] } as never)
      .mockResolvedValueOnce({ hotel_users: [seeded] } as never)
      .mockResolvedValueOnce({ update_hotel_users_by_pk: linkedRow } as never);

    const linked = await ensureHotelUser({
      firebaseUid: 'uid-1',
      email: 'guest@example.com',
    });

    expect(linked.role).toBe('MANAGER');
    expect(linked.firebase_uid).toBe('uid-1');
    expect(hotelQueryCalls().some((q) => q.includes('insert_hotel_users_one'))).toBe(false);
  });

  it('rejects a missing uid and a malformed email', async () => {
    await expect(
      ensureHotelUser({ firebaseUid: '   ', email: 'guest@example.com' }),
    ).rejects.toThrow('requires a Firebase UID');
    await expect(
      ensureHotelUser({ firebaseUid: 'uid-1', email: 'not-an-email' }),
    ).rejects.toThrow('valid email address');
  });
});

describe('syncHotelWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ensures the hotel user and mirrors a primary wallet, demoting the old primary first', async () => {
    const wallet = {
      id: 'wallet-1',
      user_id: USER.id,
      wallet_address: ADDRESS,
      chain_type: 'STELLAR',
      is_primary: true,
    };
    vi.mocked(executeGraphQL)
      .mockResolvedValueOnce({ hotel_users: [USER] } as never)
      .mockResolvedValueOnce({ update_hotel_users_by_pk: USER } as never)
      .mockResolvedValueOnce({ update_users_wallets: { affected_rows: 1 } } as never)
      .mockResolvedValueOnce({ insert_users_wallets_one: wallet } as never);

    const mirrored = await syncHotelWallet(
      { firebaseUid: 'uid-1', email: 'guest@example.com' },
      ADDRESS,
      true,
    );

    expect(mirrored).toEqual(wallet);
    const queries = hotelQueryCalls();
    const demoteIndex = queries.findIndex((q) => q.includes('update_users_wallets'));
    const insertIndex = queries.findIndex((q) => q.includes('insert_users_wallets_one'));
    expect(demoteIndex).toBeGreaterThanOrEqual(0);
    expect(insertIndex).toBeGreaterThan(demoteIndex);
    expect(vi.mocked(executeGraphQL).mock.calls[insertIndex]?.[1]).toMatchObject({
      object: { user_id: USER.id, wallet_address: ADDRESS, is_primary: true },
    });
  });

  it('skips the demote step for a non-primary wallet', async () => {
    vi.mocked(executeGraphQL)
      .mockResolvedValueOnce({ hotel_users: [USER] } as never)
      .mockResolvedValueOnce({ update_hotel_users_by_pk: USER } as never)
      .mockResolvedValueOnce({
        insert_users_wallets_one: { ...USER, is_primary: false },
      } as never);

    await syncHotelWallet({ firebaseUid: 'uid-1', email: 'guest@example.com' }, ADDRESS, false);

    expect(hotelQueryCalls().some((q) => q.includes('update_users_wallets'))).toBe(false);
  });

  it('rejects a non-Stellar address', async () => {
    await expect(
      syncHotelWallet({ firebaseUid: 'uid-1', email: 'guest@example.com' }, '0x1234', true),
    ).rejects.toThrow('Stellar G-address');
  });
});

describe('promoteHotelUserToManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promotes an existing hotel user and refreshes claims', async () => {
    const manager = { ...USER, role: 'MANAGER' as const };
    vi.mocked(executeGraphQL)
      .mockResolvedValueOnce({ hotel_users: [USER] } as never)
      .mockResolvedValueOnce({ update_hotel_users_by_pk: manager } as never);
    vi.mocked(syncHasuraClaims).mockResolvedValue(undefined as never);

    const promoted = await promoteHotelUserToManager('uid-1', 'admin-uid');

    expect(promoted.role).toBe('MANAGER');
    const update = vi.mocked(executeGraphQL).mock.calls.find(([query]) =>
      String(query).includes('update_hotel_users_by_pk'),
    );
    expect(update?.[1]).toMatchObject({ set: { role: 'MANAGER' } });
    expect(syncHasuraClaims).toHaveBeenCalledWith('uid-1');
  });

  it('still promotes when the claims refresh fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const manager = { ...USER, role: 'MANAGER' as const };
    vi.mocked(executeGraphQL)
      .mockResolvedValueOnce({ hotel_users: [USER] } as never)
      .mockResolvedValueOnce({ update_hotel_users_by_pk: manager } as never);
    vi.mocked(syncHasuraClaims).mockRejectedValueOnce(new Error('firebase unavailable'));

    await expect(promoteHotelUserToManager('uid-1', 'admin-uid')).resolves.toMatchObject({
      role: 'MANAGER',
    });
  });

  it('rejects a firebase uid that has no hotel user row', async () => {
    vi.mocked(executeGraphQL).mockResolvedValueOnce({ hotel_users: [] } as never);

    await expect(promoteHotelUserToManager('uid-missing', 'admin-uid')).rejects.toMatchObject({
      code: 'HOTEL_USER_NOT_FOUND',
    });
    expect(syncHasuraClaims).not.toHaveBeenCalled();
  });
});
