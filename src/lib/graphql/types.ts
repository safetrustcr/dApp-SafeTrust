export interface Tenant {
  id: string
  name: string
  address: string
}

export interface Landlord {
  id: string
  name: string
}

export interface Escrow {
  id: string
  address: string
  tenant: Tenant
  amount: string
  token: string
  status: "active" | "pending" | "disputed" | "completed" | "cancelled"
  created_at: string
  last_event: string
  landlord: Landlord
}

export interface EscrowFilter {
  status?: { _eq?: string }
  tenant?: { _eq?: string }
  amount?: { _gte?: string; _lte?: string }
}

export interface GetEscrowsVariables {
  limit?: number
  offset?: number
  order_by?: Array<{ [key: string]: string }>
  where?: EscrowFilter
}

export interface GetEscrowsData {
  escrows: Escrow[]
  escrows_aggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface EscrowMetrics {
  totalValueLocked: string
  activeContracts: number
  pendingContracts: number
  disputes: number
}

export interface GetEscrowMetricsData {
  escrows_aggregate: {
    aggregate: {
      count: number
      sum: {
        amount: string | null
      }
    }
  }
  active: {
    aggregate: {
      count: number
    }
  }
  pending: {
    aggregate: {
      count: number
    }
  }
  disputed: {
    aggregate: {
      count: number
    }
  }
}
