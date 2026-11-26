import { gql } from "@apollo/client";

export const GET_MY_BID_REQUESTS = gql`
  query GetMyBidRequests($limit: Int!, $offset: Int!) {
    bid_requests(
      limit: $limit
      offset: $offset
      where: { deleted_at: { _is_null: true } }
      order_by: [{ created_at: desc }]
    ) {
      id
      apartment_id
      tenant_id
      current_status
      proposed_price
      desired_move_in
      created_at
      updated_at
      apartment {
        id
        name
        price
        warranty_deposit
        address
        is_available
      }
      bid_status_histories(order_by: [{ created_at: desc }]) {
        id
        status
        notes
        changed_by
        created_at
      }
    }
    bid_requests_aggregate(where: { deleted_at: { _is_null: true } }) {
      aggregate {
        count
      }
    }
  }
`;

export const GET_APARTMENT_BID_REQUESTS = gql`
  query GetApartmentBidRequests($apartment_id: uuid!, $limit: Int!, $offset: Int!) {
    bid_requests(
      limit: $limit
      offset: $offset
      where: { apartment_id: { _eq: $apartment_id }, deleted_at: { _is_null: true } }
      order_by: [{ created_at: desc }]
    ) {
      id
      apartment_id
      tenant_id
      current_status
      proposed_price
      desired_move_in
      created_at
      updated_at
    }
    bid_requests_aggregate(
      where: { apartment_id: { _eq: $apartment_id }, deleted_at: { _is_null: true } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const CREATE_BID_REQUEST = gql`
  mutation CreateBidRequest(
    $apartment_id: uuid!
    $proposed_price: numeric!
    $desired_move_in: timestamptz!
  ) {
    insert_bid_requests_one(
      object: {
        apartment_id: $apartment_id
        proposed_price: $proposed_price
        desired_move_in: $desired_move_in
      }
    ) {
      id
      apartment_id
      tenant_id
      current_status
      proposed_price
      desired_move_in
      created_at
    }
  }
`;
