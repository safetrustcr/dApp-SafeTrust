/**
 * Booking context and wallet readiness for both booking kinds apps/api escrows:
 * apartment deposits (`rental:<apartmentId>:<guestUid>`) and hotel reservations
 * (`hotel:<reservationId>`). The rules mirror the ones apps/api enforces before
 * it builds a deploy transaction:
 *   - apartments: services/apartment-escrow-terms.ts + routes/escrow/deploy.handler.ts
 *   - hotels:     services/hotel-reservation-escrow.ts getHotelReservationEscrowTerms
 */
import type { AccountSnapshot } from './horizon.js';
import type { ApartmentTerms, EscrowRow, HotelReservationRow } from './escrow-data.js';
import { redactWallet } from './redact.js';

const STELLAR = /^G[A-Z2-7]{55}$/;
const PAYABLE_RESERVATION = ['PENDING', 'CONFIRMED'];

export type BookingContext = {
  kind: 'apartment' | 'hotel_reservation';
  id: string;
  property: string;
  dates: { from: string | null; until: string | null };
  amount: number | null;
  asset: { code: 'USDC'; issuer: string };
  hostWallet: string | null;
  guestWallet: string | null;
  engagementId: string | null;
  /** apps/api would refuse to build a deploy for these reasons. */
  blockers: Array<{ code: string; message: string }>;
};

function amountOf(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function apartmentContext(apartmentId: string, terms: ApartmentTerms, usdcIssuer: string): BookingContext | null {
  const apt = terms.apartment;
  if (!apt) return null;
  const amount = amountOf(apt.warranty_deposit);
  const blockers: BookingContext['blockers'] = [];
  if (amount === null) blockers.push({ code: 'APARTMENT_HAS_NO_DEPOSIT', message: 'This apartment has no deposit configured.' });
  if (!terms.hostWallet) blockers.push({ code: 'HOST_WALLET_MISSING', message: 'The host has not linked a primary Stellar wallet yet.' });
  return {
    kind: 'apartment',
    id: apartmentId,
    property: apt.name,
    dates: { from: apt.available_from, until: apt.available_until },
    amount,
    asset: { code: 'USDC', issuer: usdcIssuer },
    hostWallet: terms.hostWallet,
    guestWallet: null,
    // The guest's uid is part of the key, so it is only known once they deploy.
    engagementId: null,
    blockers,
  };
}

export function reservationContext(reservation: HotelReservationRow | null, usdcIssuer: string): BookingContext | null {
  if (!reservation) return null;
  const blockers: BookingContext['blockers'] = [];
  const room = reservation.room;
  const hostWallet = room?.hotel.owner.wallets[0]?.wallet_address ?? null;
  const guestWallet = reservation.wallet_address;
  const amount = amountOf(reservation.total_amount);
  const checkIn = Date.parse(reservation.check_in ?? '');
  const checkOut = Date.parse(reservation.check_out ?? '');

  if (!PAYABLE_RESERVATION.includes(reservation.reservation_status)) {
    blockers.push({ code: 'RESERVATION_NOT_PAYABLE', message: `Reservation status is ${reservation.reservation_status}; only PENDING or CONFIRMED can be paid.` });
  }
  if (!room) blockers.push({ code: 'RESERVATION_ROOM_MISSING', message: 'This reservation has no room.' });
  if (amount === null) blockers.push({ code: 'RESERVATION_AMOUNT_INVALID', message: 'This reservation has no valid payment amount.' });
  if (!Number.isFinite(checkIn) || !Number.isFinite(checkOut) || checkOut <= checkIn) {
    blockers.push({ code: 'RESERVATION_DATES_INVALID', message: 'This reservation has invalid stay dates.' });
  }
  if (!hostWallet || !STELLAR.test(hostWallet)) {
    blockers.push({ code: 'HOST_WALLET_MISSING', message: 'The hotel owner must link a primary Stellar wallet.' });
  }
  if (!guestWallet || !STELLAR.test(guestWallet) || guestWallet === hostWallet) {
    blockers.push({ code: 'RESERVATION_WALLET_INVALID', message: 'Guest and hotel must use distinct valid Stellar wallets.' });
  }

  return {
    kind: 'hotel_reservation',
    id: reservation.id,
    property: room ? `${room.hotel.name} · Room ${room.room_number}` : '(no room)',
    dates: { from: reservation.check_in, until: reservation.check_out },
    amount,
    asset: { code: 'USDC', issuer: usdcIssuer },
    hostWallet,
    guestWallet,
    engagementId: `hotel:${reservation.id}`,
    blockers,
  };
}

/** The shape the tool returns: wallets shortened, no XDR anywhere. */
export function presentContext(context: BookingContext, escrows: EscrowRow[]) {
  return {
    kind: context.kind,
    id: context.id,
    property: context.property,
    dates: context.dates,
    amount: context.amount,
    asset: context.asset,
    hostWallet: redactWallet(context.hostWallet),
    guestWallet: redactWallet(context.guestWallet),
    engagementId: context.engagementId,
    deployable: context.blockers.length === 0,
    blockers: context.blockers,
    escrows: escrows.map((e) => ({
      engagementId: e.engagement_id,
      contractId: e.contract_id && e.contract_id !== e.engagement_id ? e.contract_id : null,
      status: e.status,
      amount: Number(e.amount),
      guestWallet: redactWallet(e.sender_address),
      createdAt: e.created_at,
    })),
  };
}

/* ─────────────────────────────── readiness ─────────────────────────────── */

export type ReadinessCheck = {
  id: string;
  result: 'pass' | 'fail' | 'skip';
  detail: string;
  fix?: string;
};

/** Below this an account cannot pay fees for the deploy and fund transactions. */
export const MIN_XLM = 5;

export function readinessChecks(input: {
  context: BookingContext;
  guestRegistered: boolean | null;
  guest: AccountSnapshot | null;
  host: AccountSnapshot | null;
}): ReadinessCheck[] {
  const { context, guestRegistered, guest, host } = input;
  const checks: ReadinessCheck[] = [];

  checks.push(
    context.blockers.length === 0
      ? { id: 'booking-terms', result: 'pass', detail: `${context.amount} USDC, host wallet linked.` }
      : {
          id: 'booking-terms',
          result: 'fail',
          detail: context.blockers.map((b) => `${b.code}: ${b.message}`).join(' '),
          fix: 'Fix the listing or reservation data first; apps/api refuses to build the deploy until then.',
        },
  );

  if (!context.guestWallet) {
    checks.push({
      id: 'guest-wallet-registered',
      result: 'skip',
      detail: 'No guest wallet: apartments take it at deploy time. Pass guestAddress to check one.',
    });
  } else {
    checks.push(
      guestRegistered
        ? { id: 'guest-wallet-registered', result: 'pass', detail: `${redactWallet(context.guestWallet)} is registered to a user.` }
        : {
            id: 'guest-wallet-registered',
            result: 'fail',
            detail: `${redactWallet(context.guestWallet)} is not registered to any user.`,
            fix: 'The guest connects this wallet in the app (POST /api/auth/sync-wallet) before booking. apps/api answers 403 otherwise.',
          },
    );
  }

  const account = (role: 'guest' | 'host', snapshot: AccountSnapshot | null, address: string | null, needsBalance: boolean) => {
    const who = role === 'guest' ? 'Guest' : 'Host';
    if (!address || !snapshot) {
      checks.push({ id: `${role}-account`, result: 'skip', detail: `${who} wallet unknown.` });
      return;
    }
    const short = redactWallet(address);
    if (!snapshot.exists) {
      checks.push({
        id: `${role}-account`,
        result: 'fail',
        detail: `${who} account ${short} does not exist on Testnet.`,
        fix: 'Fund it with Friendbot (https://friendbot.stellar.org/?addr=<address>) or run pnpm testnet:provision for the fixture users.',
      });
      return;
    }
    checks.push(
      snapshot.xlm >= MIN_XLM
        ? { id: `${role}-account`, result: 'pass', detail: `${who} account ${short} exists with ${snapshot.xlm} XLM.` }
        : {
            id: `${role}-account`,
            result: 'fail',
            detail: `${who} account ${short} has ${snapshot.xlm} XLM (needs at least ${MIN_XLM} for fees).`,
            fix: 'Top it up with Friendbot.',
          },
    );
    checks.push(
      snapshot.usdc
        ? { id: `${role}-usdc-trustline`, result: 'pass', detail: `${who} holds a USDC trustline to ${redactWallet(context.asset.issuer)}.` }
        : {
            id: `${role}-usdc-trustline`,
            result: 'fail',
            detail: `${who} has no USDC trustline to the configured issuer ${redactWallet(context.asset.issuer)}.`,
            fix: `Add the USDC trustline (issuer ${context.asset.issuer}) in the wallet, or run pnpm testnet:provision for the fixture users.`,
          },
    );
    if (needsBalance && snapshot.usdc && context.amount !== null) {
      checks.push(
        snapshot.usdc.balance >= context.amount
          ? { id: 'guest-usdc-balance', result: 'pass', detail: `Guest holds ${snapshot.usdc.balance} USDC (needs ${context.amount}).` }
          : {
              id: 'guest-usdc-balance',
              result: 'fail',
              detail: `Guest holds ${snapshot.usdc.balance} USDC but the escrow needs ${context.amount}.`,
              fix: 'Send Testnet USDC to the guest wallet before funding (pnpm testnet:provision tops up the fixture guest).',
            },
      );
    }
  };

  account('guest', guest, context.guestWallet, true);
  account('host', host, context.hostWallet, false);
  return checks;
}
