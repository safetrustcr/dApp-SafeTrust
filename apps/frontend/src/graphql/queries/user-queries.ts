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

export const GET_USER_BY_WALLET_ADDRESS = gql`
  query GetUserByWalletAddress($wallet_address: String!) {
    users(
      where: {
        user_wallets: { wallet_address: { _eq: $wallet_address } }
      }
      limit: 1
    ) {
      id
      email
      first_name
      last_name
    }
  }
`;