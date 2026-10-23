import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../hasura.js', () => ({ hasuraRequest: vi.fn() }));
import { hasuraRequest } from '../hasura.js';
import { getHotelReservationEscrowTerms, hotelBookingView, type HotelReservation } from '../hotel-reservation-escrow.js';

const ID = '550e8400-e29b-41d4-a716-446655440001';
const GUEST = `G${'A'.repeat(55)}`;
const HOST = `G${'B'.repeat(55)}`;
let reservation: HotelReservation;
let wallets: string[];
beforeEach(() => {
  wallets = [GUEST];
  reservation = { id: ID, wallet_address: GUEST, reservation_status: 'PENDING', total_amount: '240.00', check_in: '2026-11-01T15:00:00Z', check_out: '2026-11-03T11:00:00Z', room: { room_id: ID, room_number: '201', room_images: [{ image_url: '/room.jpg' }], hotel: { id: ID, name: 'Hotel', address: 'San José', description: 'A room', owner: { firebase_uid: 'host', first_name: 'Owner', last_name: null, email: 'owner@example.com', wallets: [{ wallet_address: HOST }] } } } };
  vi.mocked(hasuraRequest).mockImplementation(async (query) => {
    if (query.includes('HotelCallerWallets')) return { users_wallets: wallets.map((wallet_address) => ({ wallet_address })) } as never;
    return { reservations_by_pk: reservation } as never;
  });
});
describe('hotel reservation escrow resolver', () => {
  it('uses saved terms and a stable reservation engagement', async () => {
    const terms = await getHotelReservationEscrowTerms(ID, 'guest', GUEST);
    expect(terms).toMatchObject({ amount: 240, receiverAddress: HOST, senderAddress: GUEST, engagementId: `hotel:${ID}` });
    expect(hotelBookingView(reservation, terms.amount, HOST)).toMatchObject({ name: 'Hotel · Room 201', image_urls: ['/room.jpg'], warranty_deposit: 240 });
  });
  it('rejects another guest and mismatched signing wallets', async () => {
    wallets = [HOST];
    await expect(getHotelReservationEscrowTerms(ID, 'stranger', HOST)).rejects.toMatchObject({ status: 403 });
    wallets = [GUEST, HOST];
    await expect(getHotelReservationEscrowTerms(ID, 'guest', HOST)).rejects.toMatchObject({ code: 'RESERVATION_NOT_YOURS' });
  });
  it.each(['CANCELLED', 'COMPLETED', 'CHECKED_OUT'])('rejects %s reservations', async (status) => {
    reservation.reservation_status = status;
    await expect(getHotelReservationEscrowTerms(ID, 'guest', GUEST)).rejects.toMatchObject({ code: 'RESERVATION_NOT_PAYABLE' });
  });
  it.each([null, 0, -1, 'not-a-price'])('rejects invalid saved total %s', async (amount) => {
    reservation.total_amount = amount;
    await expect(getHotelReservationEscrowTerms(ID, 'guest')).rejects.toMatchObject({ code: 'RESERVATION_AMOUNT_INVALID' });
  });
  it('rejects a hotel owner paying their own hotel', async () => {
    await expect(getHotelReservationEscrowTerms(ID, 'host', GUEST)).rejects.toMatchObject({ code: 'SELF_ESCROW_NOT_ALLOWED' });
  });
  it('requires valid stay dates and an owner Stellar wallet', async () => {
    reservation.check_out = reservation.check_in;
    await expect(getHotelReservationEscrowTerms(ID, 'guest')).rejects.toMatchObject({ code: 'RESERVATION_DATES_INVALID' });
    reservation.check_out = '2026-11-03T11:00:00Z';
    reservation.room!.hotel.owner.wallets = [];
    await expect(getHotelReservationEscrowTerms(ID, 'guest')).rejects.toMatchObject({ code: 'HOST_WALLET_MISSING' });
  });
  it('rejects malformed IDs before the reservation lookup', async () => {
    await expect(getHotelReservationEscrowTerms('room-1', 'guest')).rejects.toMatchObject({ status: 400 });
  });
});
