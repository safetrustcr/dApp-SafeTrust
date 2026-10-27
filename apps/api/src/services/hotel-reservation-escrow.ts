import { hasuraRequest } from './hasura.js';
import { ApiError } from '../http/api-error.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STELLAR = /^G[A-Z2-7]{55}$/;

type Wallet = { wallet_address: string };
export type HotelReservation = {
  id: string;
  wallet_address: string | null;
  reservation_status: string;
  total_amount: number | string | null;
  check_in: string | null;
  check_out: string | null;
  hold_expires_at: string | null;
  room: {
    room_id: string;
    room_number: string;
    room_images: Array<{ image_url: string }>;
    hotel: {
      id: string;
      name: string;
      description: string | null;
      address: string;
      owner: { firebase_uid: string | null; first_name: string | null; last_name: string | null; email: string; wallets: Wallet[] };
    };
  } | null;
};

export async function getHotelUserWallets(uid: string): Promise<string[]> {
  const data = await hasuraRequest<{ users_wallets: Wallet[] }>(
    `query HotelCallerWallets($uid: String!) {
      users_wallets(where: { user: { firebase_uid: { _eq: $uid } }, chain_type: { _eq: "STELLAR" } }) { wallet_address }
    }`, { uid },
  );
  return data.users_wallets.map((wallet) => wallet.wallet_address);
}

export async function getHotelReservation(id: string): Promise<HotelReservation> {
  if (!UUID.test(id)) throw new ApiError(400, 'RESERVATION_ID_INVALID', 'Use the saved reservation ID, rather than a room or hotel ID.');
  const data = await hasuraRequest<{ reservations_by_pk: HotelReservation | null }>(
    `query HotelReservationEscrow($id: uuid!) {
      reservations_by_pk(id: $id) {
        id wallet_address reservation_status total_amount check_in check_out hold_expires_at
        room {
          room_id room_number room_images: images { image_url }
          hotel {
            id name description address
            owner {
              firebase_uid first_name last_name email
              wallets(where: { is_primary: { _eq: true }, chain_type: { _eq: "STELLAR" } }, order_by: [{ updated_at: desc }, { id: asc }], limit: 1) { wallet_address }
            }
          }
        }
      }
    }`, { id },
  );
  if (!data.reservations_by_pk) throw new ApiError(404, 'RESERVATION_NOT_FOUND', 'Hotel reservation not found.');
  return data.reservations_by_pk;
}

export async function getHotelReservationEscrowTerms(id: string, uid: string, senderAddress?: string) {
  const wallets = await getHotelUserWallets(uid);
  const reservation = await getHotelReservation(id);
  if (!reservation.wallet_address || !wallets.includes(reservation.wallet_address) ||
      (senderAddress !== undefined && senderAddress !== reservation.wallet_address)) {
    throw new ApiError(403, 'RESERVATION_NOT_YOURS', 'Connect the registered Stellar wallet used for this reservation.');
  }
  if (!['PENDING', 'CONFIRMED'].includes(reservation.reservation_status)) {
    throw new ApiError(409, 'RESERVATION_NOT_PAYABLE', 'This reservation is no longer payable.');
  }
  // Reject expired holds at deploy time
  if (reservation.reservation_status === 'PENDING' && reservation.hold_expires_at) {
    if (new Date(reservation.hold_expires_at) < new Date()) {
      throw new ApiError(409, 'RESERVATION_HOLD_EXPIRED', 'This reservation hold has expired. Please create a new reservation.');
    }
  }
  const room = reservation.room;
  if (!room) throw new ApiError(409, 'RESERVATION_ROOM_MISSING', 'This reservation has no room.');
  if (room.hotel.owner.firebase_uid === uid) throw new ApiError(409, 'SELF_ESCROW_NOT_ALLOWED', 'You cannot pay a reservation for your own hotel.');
  const amount = Number(reservation.total_amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(409, 'RESERVATION_AMOUNT_INVALID', 'This reservation has no valid payment amount.');
  const checkIn = Date.parse(reservation.check_in ?? '');
  const checkOut = Date.parse(reservation.check_out ?? '');
  if (!Number.isFinite(checkIn) || !Number.isFinite(checkOut) || checkOut <= checkIn) {
    throw new ApiError(409, 'RESERVATION_DATES_INVALID', 'This reservation has invalid stay dates.');
  }
  const receiverAddress = room.hotel.owner.wallets[0]?.wallet_address;
  if (!receiverAddress || !STELLAR.test(receiverAddress)) throw new ApiError(409, 'HOST_WALLET_MISSING', 'The hotel owner must link a primary Stellar wallet.');
  if (!STELLAR.test(reservation.wallet_address) || receiverAddress === reservation.wallet_address) {
    throw new ApiError(409, 'RESERVATION_WALLET_INVALID', 'Guest and hotel must use distinct valid Stellar wallets.');
  }
  return { reservation, amount, receiverAddress, senderAddress: reservation.wallet_address, engagementId: `hotel:${reservation.id}` };
}

/** Adapter for the shared property review and lifecycle views. */
export function hotelBookingView(reservation: HotelReservation, amount: number, receiverAddress: string) {
  const room = reservation.room!;
  return {
    id: reservation.id,
    name: `${room.hotel.name} · Room ${room.room_number}`,
    description: room.hotel.description,
    image_urls: room.room_images.map((image) => image.image_url),
    address: { street: room.hotel.address },
    price: 0,
    warranty_deposit: amount,
    available_from: reservation.check_in,
    available_until: reservation.check_out,
    owner: { ...room.hotel.owner, user_wallets: [{ wallet_address: receiverAddress }] },
  };
}

/** Projects the shared escrow status into the hotel's existing reservation dashboard. */
export async function syncHotelEscrowTransaction(reservationId: string, contractId: string, signer: string, status: string) {
  await hasuraRequest(
    `mutation HotelEscrowProjection($reservationId: uuid!, $contractId: String!, $signer: String!, $status: String!) {
      insert_hotel_escrow_transactions_one(
        object: { reservation_id: $reservationId, contract_id: $contractId, signer_address: $signer, escrow_status: $status, escrow_transaction_type: "single_release" }
        on_conflict: { constraint: escrow_transactions_contract_id_key, update_columns: [escrow_status] }
      ) { id }
    }`, { reservationId, contractId, signer, status },
  );
}
