import { gql } from "@apollo/client";

// Aligned to hotel_industry SQL from issue #293 (not the prose typos in #294).
// room_types.name (not type_name); escrow amount via reservation.total_amount.

export const GET_HOTEL_ROOMS = gql`
  query GetHotelRooms {
    rooms(order_by: { room_number: asc }) {
      room_id
      room_number
      status
      price_night
      capacity
      room_type {
        name
      }
    }
  }
`;

export const GET_ACTIVE_RESERVATIONS = gql`
  query GetActiveReservations {
    reservations(
      where: { reservation_status: { _in: ["PENDING", "CONFIRMED"] } }
      order_by: { check_in: asc }
    ) {
      id
      reservation_status
      check_in
      check_out
      total_amount
      room {
        room_number
        hotel {
          name
        }
      }
    }
  }
`;

export const GET_HOTEL_ESCROW_TRANSACTIONS = gql`
  query GetHotelEscrowTransactions {
    escrow_transactions(order_by: { created_at: desc }, limit: 10) {
      id
      contract_id
      escrow_status
      signer_address
      created_at
      reservation {
        id
        reservation_status
        total_amount
      }
    }
  }
`;
