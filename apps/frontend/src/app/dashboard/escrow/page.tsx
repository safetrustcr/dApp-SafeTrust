"use client";

import { useState } from "react";
import { useQuery, gql } from "@apollo/client";
import { EscrowMonitorTable } from
  "@/components/dashboard/EscrowMonitorTable";
import { EscrowMonitorFilters } from
  "@/components/dashboard/EscrowMonitorFilters";
import { useGlobalAuthenticationStore } from "@/core/store/data";

const ITEMS_PER_PAGE = 5;

const GET_USER_ESCROWS = gql`
  query GetUserEscrows(
    $userId: String!
    $limit: Int!
    $offset: Int!
  ) {
    escrows(
      where: { tenant_id: { _eq: $userId } }
      limit: $limit
      offset: $offset
      order_by: { created_at: desc }
    ) {
      id engagement_id status
      amount created_at tenant_id
    }
    escrows_aggregate(
      where: { tenant_id: { _eq: $userId } }
    ) {
      aggregate { count }
    }
  }
`;

export default function EscrowMonitorPage() {
  const [page, setPage]           = useState(0);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("all");
  
  const userId = useGlobalAuthenticationStore(
    (state) => state.address ?? ""
  );
  
  const { data, loading, error } = useQuery(GET_USER_ESCROWS, {
    variables: {
      userId,
      limit: ITEMS_PER_PAGE,
      offset: page * ITEMS_PER_PAGE,
    },
    skip: !userId,
  });
  
  const escrows = data?.escrows ?? [];
  const total   = data?.escrows_aggregate?.aggregate?.count ?? 0;
  
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Escrow Monitor</h1>
        <p className="text-sm text-muted-foreground">
          Showing {escrows.length} of {total}
        </p>
      </div>
      <EscrowMonitorFilters
        search={search} onSearchChange={setSearch}
        status={statusFilter} onStatusChange={setStatus}
      />
      {loading && (
        <p className="text-sm text-muted-foreground">Loading...</p>
      )}
      {error && (
        <p className="text-sm text-red-500">
          Failed to load escrows
        </p>
      )}
      {!loading && !error && escrows.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No escrows found
        </p>
      )}
      {escrows.length > 0 && (
        <EscrowMonitorTable
          escrows={escrows}
          offset={page * ITEMS_PER_PAGE}
        />
      )}
      <div className="flex items-center justify-between pt-2">
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
          className="text-sm disabled:opacity-40"
        >←</button>
        <span className="text-sm text-muted-foreground">
          Page {page + 1}
        </span>
        <button
          disabled={(page + 1) * ITEMS_PER_PAGE >= total}
          onClick={() => setPage((p) => p + 1)}
          className="text-sm disabled:opacity-40"
        >→</button>
      </div>
    </div>
  );
}
