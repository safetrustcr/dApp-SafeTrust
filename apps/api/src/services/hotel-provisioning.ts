/**
 * hotel_industry tenant provisioning.
 *
 * The hotel escrow flow (apps/api/src/services/hotel-reservation-escrow.ts)
 * reads `hotel_industry.users` / `hotel_industry.users_wallets` and links
 * them to the caller's Firebase identity through `firebase_uid`. Sign-up and
 * wallet sync historically only wrote the `public` schema, so every
 * app-registered guest hit `403 RESERVATION_NOT_YOURS` when paying for a
 * hotel reservation (issue #567, Drips Stellar Wave).
 *
 * This module mirrors the identity created in `public.users` /
 * `public.user_wallets` into the hotel tenant so a new sign-up can book and
 * pay without manual SQL:
 *
 *   ensureHotelUser()      create/update the hotel_industry.users row for a
 *                          Firebase UID, preserving an existing hotel role.
 *                          Sign-up only ever provisions GUEST here; elevated
 *                          roles are set by an administrator through
 *                          promoteHotelUserToManager().
 *   syncHotelWallet()      mirror a verified Stellar wallet into
 *                          hotel_industry.users_wallets, linked to the
 *                          hotel user row.
 *   promoteHotelUserToManager()
 *                          admin-only promotion to MANAGER. Required by
 *                          create-hotel.handler, which refuses to create a
 *                          hotel unless the owner row has role MANAGER.
 *
 * Only this module (and the admin endpoint) writes to the two tenant tables.
 * Hasura root fields used here are defined in
 * infra/backend/metadata/tenants/hotel_industry/databases/tables/
 * hotel_industry_users.yaml and hotel_industry_users_wallets.yaml.
 *
 * Mirroring is best-effort from the public-schema handlers: sync-user and
 * sync-wallet keep their existing contract (the public user/wallet is the
 * source of truth for the SafeTrust tenant) and never fail a request because
 * the hotel tenant is unavailable. The hotel escrow path re-validates the
 * mirrored rows, so a missed mirror surfaces as the existing
 * RESERVATION_NOT_YOURS / HOST_WALLET_MISSING errors instead of a sign-up
 * failure. promoteHotelUserToManager() is the exception: it is an explicit
 * administrator action, so failures propagate to the caller.
 */

import { executeGraphQL } from '../lib/hasura.js';
import { syncHasuraClaims } from './hasura-claims.js';

export type HotelUserRole = 'GUEST' | 'STAFF' | 'MANAGER';

export interface HotelUserProfileInput {
  /** Firebase UID (the identity link between tenants) */
  firebaseUid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  // Firebase email_verified claim; required to link a seeded row by email.
  emailVerified?: boolean;
}

const HOTEL_USER_COLUMNS = 'id email first_name last_name phone_number role firebase_uid';

const GET_HOTEL_USER_BY_FIREBASE_UID = `
  query GetHotelUserByFirebaseUid($firebaseUid: String!) {
    hotel_users(where: { firebase_uid: { _eq: $firebaseUid } }, limit: 1) {
      ${HOTEL_USER_COLUMNS}
    }
  }
`;

const INSERT_HOTEL_USER = `
  mutation InsertHotelUser($object: hotel_industry_users_insert_input!) {
    insert_hotel_users_one(object: $object) {
      ${HOTEL_USER_COLUMNS}
    }
  }
`;

const UPDATE_HOTEL_USER = `
  mutation UpdateHotelUser($id: uuid!, $set: hotel_industry_users_set_input!) {
    update_hotel_users_by_pk(pk_columns: { id: $id }, _set: $set) {
      ${HOTEL_USER_COLUMNS}
    }
  }
`;

const GET_HOTEL_USER_BY_EMAIL = `
  query GetHotelUserByEmail($email: String!) {
    hotel_users(where: { email: { _eq: $email } }, limit: 1) {
      ${HOTEL_USER_COLUMNS}
    }
  }
`;

const GET_HOTEL_USER_BY_ID = `
  query GetHotelUserById($id: uuid!) {
    hotel_users_by_pk(id: $id) {
      ${HOTEL_USER_COLUMNS}
    }
  }
`;

const INSERT_HOTEL_WALLET = `
  mutation InsertHotelWallet($object: hotel_industry_users_wallets_insert_input!) {
    insert_users_wallets_one(object: $object) {
      id
      user_id
      wallet_address
      chain_type
      is_primary
    }
  }
`;

const GET_HOTEL_WALLET = `
  query GetHotelWallet($address: String!) {
    users_wallets(where: { wallet_address: { _eq: $address } }, limit: 1) {
      id
      user_id
      wallet_address
      chain_type
      is_primary
    }
  }
`;

const SET_HOTEL_WALLET_PRIMARY = `
  mutation SetHotelWalletPrimary($id: uuid!, $isPrimary: Boolean!) {
    update_users_wallets_by_pk(pk_columns: { id: $id }, _set: { is_primary: $isPrimary }) {
      id
      user_id
      wallet_address
      chain_type
      is_primary
    }
  }
`;

const DEMOTE_HOTEL_WALLETS = `
  mutation DemoteHotelWallets($userId: uuid!) {
    update_users_wallets(
      where: { user_id: { _eq: $userId }, is_primary: { _eq: true } }
      _set: { is_primary: false }
    ) {
      affected_rows
    }
  }
`;

export interface HotelUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: HotelUserRole;
  firebase_uid: string | null;
}

/**
 * Creates or updates the hotel_industry.users row for a Firebase identity.
 *
 * An existing row is matched by firebase_uid first, then by email (seed data
 * links by email). Matching by email lets a seeded MANAGER row gain its
 * firebase_uid link on first app sign-in instead of failing on the unique
 * email constraint. The existing hotel role is always preserved: sign-up
 * must never downgrade a seeded manager, nor self-promote to one.
 */
export async function ensureHotelUser(input: HotelUserProfileInput): Promise<HotelUser> {
  const firebaseUid = input.firebaseUid.trim();
  const email = input.email.trim().toLowerCase();

  if (!firebaseUid) throw new Error('ensureHotelUser requires a Firebase UID');
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('ensureHotelUser requires a valid email address');
  }

  const supplied: Record<string, string | null> = {
    first_name: input.firstName?.trim() || null,
    last_name: input.lastName?.trim() || null,
    phone_number: input.phoneNumber?.trim() || null,
  };
  // For existing rows only overwrite profile fields the caller supplied, so a
  // wallet sync (which carries no names/phone) never clears stored values.
  const suppliedOnly: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(supplied)) {
    if (value !== null) suppliedOnly[key] = value;
  }
  const profileColumns: Record<string, string | null> = { email, ...supplied };

  const existing = await executeGraphQL<{ hotel_users: HotelUser[] }>(
    GET_HOTEL_USER_BY_FIREBASE_UID,
    { firebaseUid },
  ).then((data) => data.hotel_users[0] ?? null);

  if (existing) {
    return updateHotelUser(existing.id, { firebase_uid: firebaseUid, email, ...suppliedOnly });
  }

  const byEmail = await executeGraphQL<{ hotel_users: HotelUser[] }>(
    GET_HOTEL_USER_BY_EMAIL,
    { email },
  ).then((data) => data.hotel_users[0] ?? null);

  if (byEmail) {
    // Only link seeded rows that have no identity yet, and only for a
    // verified email, so an account cannot take over someone else's row.
    if (byEmail.firebase_uid && byEmail.firebase_uid !== firebaseUid) {
      throw Object.assign(new Error('Hotel user is already linked to a different identity'), {
        status: 409,
        code: 'HOTEL_USER_ALREADY_LINKED',
      });
    }
    if (input.emailVerified !== true) {
      throw Object.assign(new Error('A verified email is required to link an existing hotel user'), {
        status: 403,
        code: 'HOTEL_EMAIL_NOT_VERIFIED',
      });
    }
    // Link the seeded row to this Firebase identity; keep its role.
    return updateHotelUser(byEmail.id, { firebase_uid: firebaseUid, email, ...suppliedOnly });
  }

  const inserted = await executeGraphQL<{ insert_hotel_users_one: HotelUser | null }>(
    INSERT_HOTEL_USER,
    { object: { ...profileColumns, firebase_uid: firebaseUid, role: 'GUEST' } },
  );
  if (!inserted.insert_hotel_users_one) {
    throw new Error('Hasura returned no hotel user row for the insert');
  }
  return inserted.insert_hotel_users_one;
}

async function updateHotelUser(
  id: string,
  set: Record<string, string | null>,
): Promise<HotelUser> {
  const updated = await executeGraphQL<{ update_hotel_users_by_pk: HotelUser | null }>(
    UPDATE_HOTEL_USER,
    { id, set },
  );
  if (!updated.update_hotel_users_by_pk) {
    throw new Error(`Hotel user updated set returned no row for id ${id}`);
  }
  return updated.update_hotel_users_by_pk;
}

export interface HotelWallet {
  id: string;
  user_id: string;
  wallet_address: string;
  chain_type: string;
  is_primary: boolean;
}

/**
 * Mirrors a verified Stellar wallet into hotel_industry.users_wallets.
 *
 * The hotel user row is ensured first, so a wallet sync that arrives before
 * (or without) an explicit sync-user call still links correctly. Never
 * called with a non-Stellar address: the caller validates the G-address.
 * When the wallet becomes primary, the user's previous primary is demoted
 * first, matching the public-schema upsert in sync-wallet.handler.
 */
export async function syncHotelWallet(
  profile: HotelUserProfileInput,
  walletAddress: string,
  isPrimary: boolean,
): Promise<HotelWallet> {
  const address = walletAddress.trim();
  if (!address.startsWith('G') || address.length !== 56) {
    throw new Error('syncHotelWallet requires a 56-character Stellar G-address');
  }

  const hotelUser = await ensureHotelUser(profile);

  // Idempotent re-sync: reuse an already mirrored wallet instead of
  // demoting it and violating the unique wallet_address constraint.
  const existingWallet = await executeGraphQL<{ users_wallets: HotelWallet[] }>(
    GET_HOTEL_WALLET,
    { address },
  ).then((data) => data.users_wallets[0] ?? null);

  if (existingWallet) {
    if (existingWallet.user_id !== hotelUser.id) {
      throw Object.assign(new Error('Wallet is already linked to a different hotel user'), {
        status: 409,
        code: 'HOTEL_WALLET_ALREADY_LINKED',
      });
    }
    if (isPrimary && !existingWallet.is_primary) {
      await executeGraphQL(DEMOTE_HOTEL_WALLETS, { userId: hotelUser.id });
      const promoted = await executeGraphQL<{ update_users_wallets_by_pk: HotelWallet | null }>(
        SET_HOTEL_WALLET_PRIMARY,
        { id: existingWallet.id, isPrimary: true },
      );
      if (!promoted.update_users_wallets_by_pk) {
        throw new Error('Hasura returned no hotel wallet row for the update');
      }
      return promoted.update_users_wallets_by_pk;
    }
    return existingWallet;
  }

  if (isPrimary) {
    await executeGraphQL(DEMOTE_HOTEL_WALLETS, { userId: hotelUser.id });
  }

  const inserted = await executeGraphQL<{ insert_users_wallets_one: HotelWallet | null }>(
    INSERT_HOTEL_WALLET,
    {
      object: {
        user_id: hotelUser.id,
        wallet_address: address,
        chain_type: 'STELLAR',
        is_primary: isPrimary,
      },
    },
  );
  if (!inserted.insert_users_wallets_one) {
    throw new Error('Hasura returned no hotel wallet row for the insert');
  }
  return inserted.insert_users_wallets_one;
}

/**
 * Promotes a hotel user to MANAGER. Admin-only; the route enforces the
 * platform admin role. The target must be an existing hotel user (created
 * by ensureHotelUser or seeded); an unprovisioned Firebase UID is rejected
 * so an administrator cannot mint hotel rows for identities that never
 * signed up. Hasura claims are refreshed (best-effort) so the
 * hotel_manager role is usable on the next ID token.
 */
export async function promoteHotelUserToManager(
  firebaseUid: string,
  requesterUid: string,
): Promise<HotelUser> {
  const target = firebaseUid.trim();
  if (!target) throw new Error('A Firebase UID is required');

  const existing = await executeGraphQL<{ hotel_users: HotelUser[] }>(
    GET_HOTEL_USER_BY_FIREBASE_UID,
    { firebaseUid: target },
  ).then((data) => data.hotel_users[0] ?? null);

  if (!existing) {
    throw Object.assign(new Error('Hotel user not found for this Firebase UID'), {
      status: 404,
      code: 'HOTEL_USER_NOT_FOUND',
    });
  }

  const promoted = await updateHotelUser(existing.id, { role: 'MANAGER' });

  try {
    await syncHasuraClaims(target);
  } catch (err) {
    // Claims are refreshed on the next sign-in / backfill; a stale token
    // must not undo the promotion.
    console.warn(
      `[hotel-provisioning] could not refresh Hasura claims for ${target} after MANAGER promotion by ${requesterUid}:`,
      err instanceof Error ? err.message : err,
    );
  }

  console.log(
    `[hotel-provisioning] ✅ hotel user ${promoted.id} (firebase_uid: ${target}) promoted to MANAGER by ${requesterUid}`,
  );

  return promoted;
}

/** Reads one hotel user by id; used to verify a promotion landed. */
export async function getHotelUserById(id: string): Promise<HotelUser | null> {
  const data = await executeGraphQL<{ hotel_users_by_pk: HotelUser | null }>(
    GET_HOTEL_USER_BY_ID,
    { id },
  );
  return data.hotel_users_by_pk;
}
