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