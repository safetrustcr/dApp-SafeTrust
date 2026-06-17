// apps/frontend/src/graphql/queries/escrow-queries.ts
import { gql } from "@apollo/client";

export const GET_ESCROWS = gql`
  query GetEscrows($limit: Int!, $offset: Int!) {
    escrows(
      limit: $limit
      offset: $offset
      order_by: { created_at: desc }
    ) {
      id
      contract_id
      engagement_id
      amount
      status
      created_at
      sender_address
      receiver_address
      apartment {
        id
        name
        address
        image_urls
      }
    }
    escrows_aggregate {
      aggregate {
        count
      }
    }
  }
`;

export const GET_ESCROW_BY_ID = gql`
  query GetEscrowById($id: uuid!) {
    escrows_by_pk(id: $id) {
      id
      contract_id
      engagement_id
      amount
      status
      created_at
      updated_at
      sender_address
      receiver_address
      apartment {
        id
        name
        description
        image_urls
        price
        warranty_deposit
        address
        available_from
        available_until
        owner {
          id
          first_name
          last_name
          email
          phone_number
          country_code
        }
      }
    }
  }
`;
