import { gql } from "@apollo/client"

export const GET_ESCROWS = gql`
  query GetEscrows(
    $limit: Int = 10
    $offset: Int = 0
    $order_by: [escrows_order_by!] = { created_at: desc }
    $where: escrows_bool_exp
  ) {
    escrows(
      limit: $limit
      offset: $offset
      order_by: $order_by
      where: $where
    ) {
      id
      address
      tenant {
        id
        name
        address
      }
      amount
      token
      status
      created_at
      last_event
      landlord {
        id
        name
      }
    }
    escrows_aggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

export const GET_ESCROW_METRICS = gql`
  query GetEscrowMetrics {
    escrows_aggregate {
      aggregate {
        count
        sum {
          amount
        }
      }
    }
    active: escrows_aggregate(where: { status: { _eq: "active" } }) {
      aggregate {
        count
      }
    }
    pending: escrows_aggregate(where: { status: { _eq: "pending" } }) {
      aggregate {
        count
      }
    }
    disputed: escrows_aggregate(where: { status: { _eq: "disputed" } }) {
      aggregate {
        count
      }
    }
  }
`
