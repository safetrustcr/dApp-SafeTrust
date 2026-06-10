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
      order_by: { last_seen: desc }
    ) {
      id
      email
      first_name
      last_name
      phone_number
      country_code
      location
      last_seen
      user_wallets(
        where: { is_primary: { _eq: true } }
        limit: 1
      ) {
        wallet_address
        chain_type
        is_primary
      }
    }
    users_aggregate {
      aggregate {
        count
      }
    }
  }
`;