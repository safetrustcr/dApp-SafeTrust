import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  toBookingReference,
  resolveBookingEscrowTerms,
  apartmentEscrowTermsResolver,
  hotelReservationEscrowResolver,
} from '../booking-escrow-terms.js';
import { ApiError } from '../../http/api-error.js';

vi.mock('../hasura.js', () => ({
  hasuraRequest: vi.fn(),
}));

vi.mock('../hotel-reservation-escrow.js', () => ({
  getHotelReservationEscrowTerms: vi.fn(),
}));

vi.mock('../apartment-escrow-terms.js', () => ({
  getApartmentEscrowTerms: vi.fn(),
  ApartmentTermsError: class extends Error {
    constructor(readonly status: number, readonly code: string, message: string) {
      super(message);
    }
  },
}));

vi.mock('../escrow-authz.js', () => ({
  getUserWallets: vi.fn(),
}));

import { getHotelReservationEscrowTerms } from '../hotel-reservation-escrow.js';
import { getApartmentEscrowTerms } from '../apartment-escrow-terms.js';
import { getUserWallets } from '../escrow-authz.js';

describe('booking-escrow-terms service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('toBookingReference', () => {
    it('correctly maps apartmentId to apartment reference', () => {
      const ref = toBookingReference({ apartmentId: 'apt-123' });
      expect(ref).toEqual({ kind: 'apartment', apartmentId: 'apt-123' });
    });

    it('correctly maps reservationId to hotel-reservation reference', () => {
      const ref = toBookingReference({ reservationId: 'res-456' });
      expect(ref).toEqual({ kind: 'hotel-reservation', reservationId: 'res-456' });
    });

    it('throws 400 if both apartmentId and reservationId are provided', () => {
      expect(() => toBookingReference({ apartmentId: 'apt-1', reservationId: 'res-1' })).toThrow(ApiError);
    });

    it('throws 400 if neither identifier is provided', () => {
      expect(() => toBookingReference({})).toThrow(ApiError);
    });

    it('throws 400 if body is null or not an object', () => {
      expect(() => toBookingReference(null)).toThrow(ApiError);
    });

    it.each([
      ['non-string reservationId', { apartmentId: 'apt-1', reservationId: 123 }],
      ['blank reservationId', { apartmentId: 'apt-1', reservationId: '   ' }],
      ['non-string apartmentId', { apartmentId: false, reservationId: 'res-1' }],
      ['blank apartmentId', { apartmentId: '', reservationId: 'res-1' }],
    ])('throws 400 for a malformed extra identifier (%s)', (_label, body) => {
      expect(() => toBookingReference(body)).toThrow(ApiError);
    });

    it('treats null identifiers as absent', () => {
      expect(toBookingReference({ apartmentId: 'apt-1', reservationId: null })).toEqual({
        kind: 'apartment',
        apartmentId: 'apt-1',
      });
    });
  });

  describe('resolveBookingEscrowTerms', () => {
    it('resolves apartment terms correctly with registered wallet', async () => {
      vi.mocked(getUserWallets).mockResolvedValueOnce(['G_SENDER_WALLET']);
      vi.mocked(getApartmentEscrowTerms).mockResolvedValueOnce({
        apartmentId: 'apt-999',
        ownerUserId: 'owner-uid',
        receiverAddress: 'G_HOST_RECEIVER',
        amount: 850,
      });

      const terms = await resolveBookingEscrowTerms(
        { kind: 'apartment', apartmentId: 'apt-999' },
        'tenant-uid',
        'G_SENDER_WALLET',
      );

      expect(terms).toEqual({
        bookingId: 'apt-999',
        tenantId: 'safetrust',
        engagementId: 'rental:apt-999:tenant-uid',
        amount: 850,
        receiverAddress: 'G_HOST_RECEIVER',
        title: 'SafeTrust Rental — apt-999',
        description: 'Security deposit for apartment apt-999',
        milestoneDescription: 'Rental security deposit',
      });
    });

    it('keys the engagement on the canonical apartment id, not the caller spelling', async () => {
      vi.mocked(getUserWallets).mockResolvedValueOnce(['G_SENDER_WALLET']);
      vi.mocked(getApartmentEscrowTerms).mockResolvedValueOnce({
        apartmentId: 'aaaaaaaa-0000-0000-0000-00000000000a',
        ownerUserId: 'owner-uid',
        receiverAddress: 'G_HOST_RECEIVER',
        amount: 850,
      });

      const terms = await resolveBookingEscrowTerms(
        { kind: 'apartment', apartmentId: 'AAAAAAAA-0000-0000-0000-00000000000A' },
        'tenant-uid',
        'G_SENDER_WALLET',
      );

      expect(terms.bookingId).toBe('aaaaaaaa-0000-0000-0000-00000000000a');
      expect(terms.engagementId).toBe('rental:aaaaaaaa-0000-0000-0000-00000000000a:tenant-uid');
      expect(terms).not.toHaveProperty('legacyEngagementIds');
    });

    it('throws 409 if tenant is the apartment owner', async () => {
      vi.mocked(getUserWallets).mockResolvedValueOnce(['G_SENDER_WALLET']);
      vi.mocked(getApartmentEscrowTerms).mockResolvedValueOnce({
        apartmentId: 'apt-999',
        ownerUserId: 'same-uid',
        receiverAddress: 'G_HOST_RECEIVER',
        amount: 850,
      });

      await expect(
        resolveBookingEscrowTerms({ kind: 'apartment', apartmentId: 'apt-999' }, 'same-uid', 'G_SENDER_WALLET'),
      ).rejects.toThrow(ApiError);
    });

    it('resolves hotel reservation terms correctly', async () => {
      vi.mocked(getHotelReservationEscrowTerms).mockResolvedValueOnce({
        amount: 450,
        receiverAddress: 'G_HOTEL_RECEIVER',
        senderAddress: 'G_GUEST_WALLET',
        engagementId: 'hotel:res-101',
        reservation: { id: 'res-101', check_in: '2026-12-01', check_out: '2026-12-05' } as any,
      });

      const terms = await resolveBookingEscrowTerms(
        { kind: 'hotel-reservation', reservationId: 'res-101' },
        'guest-uid',
        'G_GUEST_WALLET',
      );

      expect(terms).toEqual({
        bookingId: 'res-101',
        tenantId: 'hotel_industry',
        engagementId: 'hotel:res-101',
        amount: 450,
        receiverAddress: 'G_HOTEL_RECEIVER',
        title: 'SafeTrust Hotel — res-101',
        description: 'Payment for hotel reservation res-101',
        milestoneDescription: 'Hotel reservation payment',
        reservation: { id: 'res-101', check_in: '2026-12-01', check_out: '2026-12-05' },
      });
    });
  });
});
