import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

// Issue #567 end to end: a brand-new app sign-up syncs its identity, syncs a
// Stellar wallet, holds a hotel reservation with that wallet and then resolves
// escrow terms (the ownership check used by escrow deploy). The hotel tenant
// is an in-memory fake behind the real provisioning, handler and escrow code.

type HotelUserRow = { id: string; email: string; first_name: string | null; last_name: string | null; phone_number: string | null; role: string; firebase_uid: string | null };
type HotelWalletRow = { id: string; user_id: string; wallet_address: string; chain_type: string; is_primary: boolean };

const db = vi.hoisted(() => ({
  users: [] as unknown[],
  wallets: [] as unknown[],
  reservation: null as unknown,
  seq: 0,
}));

vi.mock('firebase-admin/auth', () => ({ getAuth: vi.fn() }));
vi.mock('../../src/services/user-provisioning.js', () => ({
  ensureUserRole: vi.fn(),
  syncUserProfile: vi.fn(),
}));
vi.mock('../../src/services/hasura-claims.js', () => ({ syncHasuraClaims: vi.fn() }));
vi.mock('../../src/services/apartment-escrow-terms.js', () => ({
  getApartmentEscrowTerms: vi.fn(),
  ApartmentTermsError: class extends Error {},
}));

vi.mock('../../src/lib/hasura.js', () => ({
  executeGraphQL: vi.fn(async (query: string, vars: Record<string, any>) => {
    const users = db.users as HotelUserRow[];
    const wallets = db.wallets as HotelWalletRow[];
    if (query.includes('GetHotelUserByFirebaseUid')) return { hotel_users: users.filter((u) => u.firebase_uid === vars.firebaseUid) };
    if (query.includes('GetHotelUserByEmail')) return { hotel_users: users.filter((u) => u.email === vars.email) };
    if (query.includes('InsertHotelUser')) {
      const row = { id: `hu-${++db.seq}`, phone_number: null, first_name: null, last_name: null, ...vars.object } as HotelUserRow;
      users.push(row);
      return { insert_hotel_users_one: row };
    }
    if (query.includes('UpdateHotelUser')) {
      const row = users.find((u) => u.id === vars.id)!;
      Object.assign(row, vars.set);
      return { update_hotel_users_by_pk: row };
    }
    if (query.includes('GetHotelWallet')) return { users_wallets: wallets.filter((w) => w.wallet_address === vars.address) };
    if (query.includes('DemoteHotelWallets')) {
      wallets.filter((w) => w.user_id === vars.userId).forEach((w) => { w.is_primary = false; });
      return { update_users_wallets: { affected_rows: 1 } };
    }
    if (query.includes('InsertHotelWallet')) {
      const row = { id: `hw-${++db.seq}`, ...vars.object } as HotelWalletRow;
      wallets.push(row);
      return { insert_users_wallets_one: row };
    }
    throw new Error(`unexpected hotel query: ${query.slice(0, 60)}`);
  }),
}));

vi.mock('../../src/services/hasura.js', () => ({
  hasuraRequest: vi.fn(async (query: string, vars: Record<string, any>) => {
    if (query.includes('SyncWallet')) {
      return { insert_user_wallets_one: { id: 'pw-1', wallet_address: vars.walletAddress, chain_type: 'STELLAR', is_primary: vars.isPrimary, provider: vars.provider } };
    }
    if (query.includes('HotelCallerWallets')) {
      const owner = (db.users as HotelUserRow[]).find((u) => u.firebase_uid === vars.uid);
      const mine = (db.wallets as HotelWalletRow[]).filter((w) => owner && w.user_id === owner.id && w.chain_type === 'STELLAR');
      return { users_wallets: mine.map((w) => ({ wallet_address: w.wallet_address })) };
    }
    if (query.includes('HotelReservationEscrow')) return { reservations_by_pk: db.reservation };
    throw new Error(`unexpected hasura query: ${query.slice(0, 60)}`);
  }),
}));

import { getAuth } from 'firebase-admin/auth';
import { syncUserProfile } from '../../src/services/user-provisioning.js';
import { syncUserHandler } from '../../src/routes/auth/sync-user.handler.js';
import { syncWalletHandler } from '../../src/routes/auth/sync-wallet.handler.js';
import { resolveBookingEscrowTerms } from '../../src/services/booking-escrow-terms.js';

const RES_ID = '550e8400-e29b-41d4-a716-446655440001';
const GUEST_WALLET = `G${'A'.repeat(55)}`;
const HOST_WALLET = `G${'B'.repeat(55)}`;

function mockRes() {
  const res = { statusCode: 0, body: undefined as unknown };
  const api = {
    status(code: number) { res.statusCode = code; return api; },
    json(payload: unknown) { res.body = payload; return api; },
  };
  return { res, api };
}

function reservationFor(walletAddress: string) {
  return {
    id: RES_ID,
    wallet_address: walletAddress,
    reservation_status: 'PENDING',
    total_amount: '240.00',
    check_in: '2030-11-01T15:00:00Z',
    check_out: '2030-11-03T11:00:00Z',
    hold_expires_at: null,
    room: {
      room_id: RES_ID,
      room_number: '201',
      room_images: [],
      hotel: {
        id: RES_ID, name: 'Hotel', description: null, address: 'San Jose',
        owner: { firebase_uid: 'host-uid', first_name: 'Owner', last_name: null, email: 'owner@example.com', wallets: [{ wallet_address: HOST_WALLET }] },
      },
    },
  };
}

async function signUpAndSyncWallet() {
  const signUp = mockRes();
  await syncUserHandler(
    { headers: { authorization: 'Bearer t' }, body: { phone_number: '+1 555 0100' } } as unknown as Request,
    signUp.api as unknown as Response,
  );
  const wallet = mockRes();
  await syncWalletHandler(
    { user: { uid: 'guest-uid', email: 'guest@example.com' }, body: { walletAddress: GUEST_WALLET, chainType: 'STELLAR', isPrimary: true, provider: 'freighter' } } as never,
    wallet.api as never,
    vi.fn(),
  );
  return { signUp, wallet };
}

describe('new guest: sign-up, wallet sync, reservation, escrow deploy terms (#567)', () => {
  beforeEach(() => {
    db.users = [];
    db.wallets = [];
    db.seq = 0;
    db.reservation = reservationFor(GUEST_WALLET);
    vi.mocked(getAuth).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'guest-uid', email: 'guest@example.com', email_verified: true, name: 'Ada Lovelace' }),
    } as never);
    vi.mocked(syncUserProfile).mockResolvedValue({ id: 'guest-uid' } as never);
  });

  it('resolves escrow terms for the new guest without RESERVATION_NOT_YOURS', async () => {
    const { signUp, wallet } = await signUpAndSyncWallet();
    expect(signUp.res.statusCode).toBe(200);
    expect(wallet.res.statusCode).toBe(200);

    const hotelUsers = db.users as HotelUserRow[];
    expect(hotelUsers).toHaveLength(1);
    expect(hotelUsers[0]).toMatchObject({ firebase_uid: 'guest-uid', role: 'GUEST' });
    expect(db.wallets).toMatchObject([{ user_id: hotelUsers[0].id, wallet_address: GUEST_WALLET, is_primary: true }]);

    const terms = await resolveBookingEscrowTerms({ kind: 'hotel-reservation', reservationId: RES_ID }, 'guest-uid', GUEST_WALLET);
    expect(terms).toMatchObject({
      bookingId: RES_ID,
      tenantId: 'hotel_industry',
      engagementId: `hotel:${RES_ID}`,
      amount: 240,
      receiverAddress: HOST_WALLET,
    });
  });

  it('still returns 403 RESERVATION_NOT_YOURS for a different user', async () => {
    await signUpAndSyncWallet();
    await expect(
      resolveBookingEscrowTerms({ kind: 'hotel-reservation', reservationId: RES_ID }, 'stranger-uid', GUEST_WALLET),
    ).rejects.toMatchObject({ status: 403, code: 'RESERVATION_NOT_YOURS' });
  });

  it('is 403 without the provisioning (regression for the original bug)', async () => {
    await expect(
      resolveBookingEscrowTerms({ kind: 'hotel-reservation', reservationId: RES_ID }, 'guest-uid', GUEST_WALLET),
    ).rejects.toMatchObject({ status: 403, code: 'RESERVATION_NOT_YOURS' });
  });
});
