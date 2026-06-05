// apps/web/src/graphql/queries/user-queries.ts
import { gql } from "@apollo/client";

export const GET_USER = gql`
  query GetUser {
    users {
      id
      email
      last_seen
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers($limit: Int!, $offset: Int!) {
    users(
      limit: $limit
      offset: $offset
      order_by: { created_at: desc }
    ) {
      id
      email
      first_name
      last_name
      phone_number
      country_code
      location
      last_seen
    }
    users_aggregate {
      aggregate {
        count
      }
    }
  }
`;