import { ApiError } from '../http/api-error.js';
import { getApartmentEscrowTerms, ApartmentTermsError } from './apartment-escrow-terms.js';
import { getHotelReservationEscrowTerms } from './hotel-reservation-escrow.js';
import { getUserWallets } from './escrow-authz.js';

export type BookingReference =
  | { kind: 'apartment'; apartmentId: string }
  | { kind: 'hotel-reservation'; reservationId: string };

export type ResolvedEscrowTerms = {
  bookingId: string;
  tenantId: 'safetrust' | 'hotel_industry';
  engagementId: string;
  amount: number | string;
  receiverAddress: string;
  title: string;
  description: string;
  milestoneDescription: string;
  reservation?: any;
};

export interface EscrowTermsResolver<R extends BookingReference = BookingReference> {
  resolve(ref: R, uid: string, senderAddress?: string): Promise<ResolvedEscrowTerms>;
}

export function toBookingReference(body: unknown): BookingReference {
  if (!body || typeof body !== 'object') {
    throw new ApiError(400, 'INVALID_BODY', 'Provide exactly one apartmentId or reservationId, and senderAddress');
  }
  const { apartmentId, reservationId } = body as { apartmentId?: unknown; reservationId?: unknown };
  const isValidId = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
  const isSupplied = (value: unknown) => value !== undefined && value !== null;

  // An identifier that is present but malformed is rejected, never ignored:
  // { apartmentId: 'valid', reservationId: 123 } must not fall back to an apartment escrow.
  if ((isSupplied(apartmentId) && !isValidId(apartmentId)) || (isSupplied(reservationId) && !isValidId(reservationId))) {
    throw new ApiError(400, 'INVALID_BOOKING_REFERENCE', 'Provide exactly one apartmentId or reservationId, and senderAddress');
  }

  const hasApt = isValidId(apartmentId);
  const hasRes = isValidId(reservationId);

  if ((!hasApt && !hasRes) || (hasApt && hasRes)) {
    throw new ApiError(400, 'INVALID_BOOKING_REFERENCE', 'Provide exactly one apartmentId or reservationId, and senderAddress');
  }

  if (hasApt) {
    return { kind: 'apartment', apartmentId: apartmentId as string };
  }
  return { kind: 'hotel-reservation', reservationId: reservationId as string };
}

export const apartmentEscrowTermsResolver: EscrowTermsResolver<{ kind: 'apartment'; apartmentId: string }> = {
  async resolve(ref, uid, senderAddress) {
    if (senderAddress) {
      const callerWallets = await getUserWallets(uid);
      if (!callerWallets.includes(senderAddress)) {
        throw new ApiError(403, 'WALLET_NOT_REGISTERED', 'Connect and register the Stellar wallet that will sign this escrow.');
      }
    }
    let terms;
    try {
      terms = await getApartmentEscrowTerms(ref.apartmentId);
    } catch (error) {
      if (error instanceof ApartmentTermsError) {
        throw new ApiError(error.status, error.code, error.message);
      }
      throw error;
    }
    if (terms.ownerUserId === uid) {
      throw new ApiError(409, 'SELF_ESCROW_NOT_ALLOWED', 'You cannot create a rental escrow for your own apartment.');
    }

    // Key the engagement on the database's canonical id so different casings of the
    // same UUID can't open a second escrow. Escrows created earlier under another
    // casing are found by deploy.handler via findRentalEscrowForUser.
    const apartmentId = terms.apartmentId;

    return {
      bookingId: apartmentId,
      tenantId: 'safetrust',
      engagementId: `rental:${apartmentId}:${uid}`,
      amount: terms.amount,
      receiverAddress: terms.receiverAddress,
      title: `SafeTrust Rental — ${apartmentId}`,
      description: `Security deposit for apartment ${apartmentId}`,
      milestoneDescription: 'Rental security deposit',
    };
  },
};

export const hotelReservationEscrowResolver: EscrowTermsResolver<{ kind: 'hotel-reservation'; reservationId: string }> = {
  async resolve(ref, uid, senderAddress) {
    const hotelTerms = await getHotelReservationEscrowTerms(ref.reservationId, uid, senderAddress);
    return {
      bookingId: ref.reservationId,
      tenantId: 'hotel_industry',
      engagementId: hotelTerms.engagementId ?? `hotel:${ref.reservationId}`,
      amount: hotelTerms.amount,
      receiverAddress: hotelTerms.receiverAddress,
      title: `SafeTrust Hotel — ${ref.reservationId}`,
      description: `Payment for hotel reservation ${ref.reservationId}`,
      milestoneDescription: 'Hotel reservation payment',
      reservation: hotelTerms.reservation,
    };
  },
};

const resolvers: Record<BookingReference['kind'], EscrowTermsResolver<any>> = {
  apartment: apartmentEscrowTermsResolver,
  'hotel-reservation': hotelReservationEscrowResolver,
};

export const resolveBookingEscrowTerms = (
  ref: BookingReference,
  uid: string,
  senderAddress?: string,
): Promise<ResolvedEscrowTerms> => resolvers[ref.kind].resolve(ref, uid, senderAddress);
