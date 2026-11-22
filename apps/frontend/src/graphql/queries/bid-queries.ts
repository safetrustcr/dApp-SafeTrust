import { gql } from "@apollo/client";

export const GET_RENTAL_OFFERS = gql`
  query GetRentalOffers($apartment_id: uuid!, $order_by: [bid_requests_order_by!]) {
    bid_requests(
      where: { apartment_id: { _eq: $apartment_id } },
      order_by: $order_by
    ) {
      id
      current_status
      proposed_price
      desired_move_in
      created_at
      tenant {
        id
        name
        phone
      }
    }
    bid_requests_aggregate(where: { apartment_id: { _eq: $apartment_id } }) {
      aggregate {
        count
      }
    }
  }
`;

export const UPDATE_BID_STATUS = gql`
  mutation UpdateBidStatus($id: uuid!, $status: String!) {
    update_bid_requests_by_pk(
      pk_columns: { id: $id },
      _set: { current_status: $status }
    ) {
      id
      current_status
    }
  }
`;

export const CREATE_BID = gql`
  mutation CreateBid($apartment_id: uuid!, $tenant_id: String!, $proposed_price: numeric!, $desired_move_in: timestamptz!) {
    insert_bid_requests_one(
      object: {
        apartment_id: $apartment_id,
        tenant_id: $tenant_id,
        proposed_price: $proposed_price,
        desired_move_in: $desired_move_in
      }
    ) {
      id
      current_status
    }
  }
`;
