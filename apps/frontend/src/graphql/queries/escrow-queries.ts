// apps/frontend/src/graphql/queries/escrow-queries.ts
import { gql } from "@apollo/client";

export const GET_ESCROWS = gql`
  query GetEscrows(
    $limit: Int!
    $offset: Int!
    $where: escrows_bool_exp = {}
    $recentWhere: escrows_bool_exp = {}
    $trustlessWorkWhere: trustlessWorkEscrows_bool_exp = {}
  ) {
    escrows(
      limit: $limit
      offset: $offset
      where: $where
      order_by: { created_at: desc }
    ) {
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
        address
        image_urls
        available_from
        available_until
      }
    }
    escrows_aggregate(where: $where) {
      aggregate {
        count
      }
    }
    recent_escrows: escrows(
      where: $recentWhere
      order_by: { updated_at: desc }
    ) {
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
        address
        image_urls
        available_from
        available_until
      }
    }
    trustlessWorkEscrows: trustlessWorkEscrows(
      where: $trustlessWorkWhere
      order_by: { updatedAt: desc }
    ) {
      id
      contract_id: contractId
      status
      asset_issuer: assetIssuer
      marker
      booking_id: bookingId
      check_in_date: checkInDate
      check_out_date: checkOutDate
      created_at: createdAt
      updated_at: updatedAt
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
      resolution_notes
      tenant_wallet {
        user {
          id
          first_name
          last_name
          email
          phone_number
          country_code
        }
      }
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
          user_wallets(where: { is_primary: { _eq: true } }, limit: 1) {
            wallet_address
          }
        }
      }
    }
  }
`;

export const GET_ESCROW_BY_ANY_ID = gql`
  query GetEscrowByAnyId($id: uuid, $engagement_id: String, $contract_id: String) {
    escrows(
      where: {
        _or: [
          { id: { _eq: $id } },
          { engagement_id: { _eq: $engagement_id } },
          { contract_id: { _eq: $contract_id } }
        ]
      }
    ) {
      id
      contract_id
      engagement_id
      amount
      status
      created_at
      updated_at
      sender_address
      receiver_address
      resolution_notes
      tenant_wallet {
        user {
          id
          first_name
          last_name
          email
          phone_number
          country_code
        }
      }
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
          user_wallets(where: { is_primary: { _eq: true } }, limit: 1) {
            wallet_address
          }
        }
      }
    }
    trustlessWorkEscrows: trustlessWorkEscrows(
      where: { contractId: { _eq: $contract_id } }
      limit: 1
    ) {
      approver
      marker
      releaser
      resolver
    }
  }
`;

export const GET_ESCROW_DASHBOARD_STATS = gql`
  query GetEscrowDashboardStats($tenant_id: String!) {
    total: trustlessWorkEscrows_aggregate(
      where: { tenantId: { _eq: $tenant_id } }
    ) {
      aggregate {
        count
      }
    }
    active: trustlessWorkEscrows_aggregate(
      where: {
        tenantId: { _eq: $tenant_id }
        status: { _in: ["funded", "active", "milestone_approved"] }
      }
    ) {
      aggregate {
        count
      }
    }
    completed: trustlessWorkEscrows_aggregate(
      where: {
        tenantId: { _eq: $tenant_id }
        status: { _eq: "completed" }
      }
    ) {
      aggregate {
        count
      }
    }
    total_value: trustlessWorkEscrows_aggregate(
      where: {
        tenantId: { _eq: $tenant_id }
        status: { _nin: ["cancelled", "resolved"] }
      }
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
  }
`;


