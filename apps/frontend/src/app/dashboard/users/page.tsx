"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { Input } from "@/components/ui/input";
import { UsersMonitorTable } from "@/components/dashboard/UsersMonitorTable";
import { GET_USERS } from "@/graphql/queries/user-queries";

const ITEMS_PER_PAGE = 5;

export default function UsersPage() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const offset = page * ITEMS_PER_PAGE;

  const { data, loading, error } = useQuery(GET_USERS, {
    variables: { limit: ITEMS_PER_PAGE, offset },
  });

  const users = data?.users ?? [];
  const total = data?.users_aggregate?.aggregate?.count ?? 0;

  const filtered = search
    ? users.filter((u: { first_name?: string | null; last_name?: string | null; email: string }) =>
        [u.first_name, u.last_name, u.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : users;

  return (
    <div className="max-w-7xl mx-auto space-y-4 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Showing {filtered.length} of {total}
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search anything..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-xs"
        />
      </div>

      {/* States */}
      {loading && (
        <p className="text-sm text-muted-foreground">Loading...</p>
      )}
      {error && (
        <p className="text-sm text-destructive">Failed to load users</p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No users found</p>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <UsersMonitorTable users={filtered} offset={offset} />
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
        <p>Showing {filtered.length} of {total}</p>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 disabled:opacity-40"
          >
            ←
          </button>
          <span>Page {page + 1}</span>
          <button
            disabled={(page + 1) * ITEMS_PER_PAGE >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 disabled:opacity-40"
          >
            →
          </button>
        </div>
        <p>Items per page: {ITEMS_PER_PAGE}</p>
      </div>
    </div>
  );
}
