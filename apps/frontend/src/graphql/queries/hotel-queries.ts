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

// ── Listing feed (issue #521) ──────────────────────────────────────────────
// Selects only the fields in docs/frontend-migration/listing-fields.md.
// Rooted at `rooms` because `hotels → rooms` is declared as an object
// relationship on a non-unique FK (see public_hotels.yaml); `rooms.hotel` is
// the safe FK direction. One listing card per room, priced per night.

export const GET_HOTEL_LISTINGS = gql`
  query GetHotelListings($limit: Int!, $offset: Int!) {
    rooms(limit: $limit, offset: $offset, order_by: { created_at: desc }) {
      room_id
      price_night
      hotel {
        name
        address
        coordinates
      }
    }
  }
`;

export const GET_HOTEL_LISTING_BY_ID = gql`
  query GetHotelListingById($id: uuid!) {
    rooms(where: { room_id: { _eq: $id } }, limit: 1) {
      room_id
      price_night
      hotel {
        name
        address
        coordinates
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
