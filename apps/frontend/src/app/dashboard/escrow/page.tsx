"use client";

import { useQuery } from "@apollo/client";
import { EscrowStatusBadge, type EscrowStatus } from "@/components/dashboard/EscrowStatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PlusIcon, Home, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GET_ESCROWS } from "@/graphql/queries/escrow-queries";

const FILTER_TABS = ["All", "Pending", "Active", "Completed", "Disputed"] as const;

const ITEMS_PER_PAGE = 10;

function normalizeStatus(status: string): EscrowStatus {
  const map: Record<string, EscrowStatus> = {
    pending_signature: "pending_signature",
    deploying: "pending_signature",
    funded: "funded",
    active: "active",
    completed: "completed",
    disputed: "disputed",
    resolved: "resolved",
    cancelled: "cancelled",
  };
  return map[status.toLowerCase()] ?? "pending_signature";
}

export default function EscrowPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<(typeof FILTER_TABS)[number]>("All");
  const [page, setPage] = useState(0);

  const offset = page * ITEMS_PER_PAGE;

  const { data, loading, error } = useQuery(GET_ESCROWS, {
    variables: { limit: ITEMS_PER_PAGE, offset },
  });

  const allEscrows = data?.escrows ?? [];
  const total = data?.escrows_aggregate?.aggregate?.count ?? 0;

  const filtered = allEscrows.filter((e: { status: string }) => {
    if (activeFilter === "All") return true;
    return e.status.toLowerCase().includes(activeFilter.toLowerCase());
  });

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Escrows</h1>
        <Button className="flex items-center gap-2 w-fit">
          <PlusIcon className="h-4 w-4" />
          New Escrow
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveFilter(tab); setPage(0); }}
              className={`py-2 px-3 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive text-center py-8">
          Failed to load escrows — {error.message}
        </p>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-28">ID</TableHead>
                <TableHead>Property</TableHead>
                <TableHead className="w-32">Amount</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead className="w-28">Created</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No escrows found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((escrow: {
                  id: string;
                  contract_id: string;
                  amount: number;
                  status: string;
                  created_at: string;
                  apartment?: {
                    id: string;
                    name: string;
                    image_urls?: string[] | null;
                    address?: { city?: string; neighborhood?: string };
                  } | null;
                }) => (
                  <TableRow key={escrow.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {escrow.contract_id?.slice(0, 10) ?? escrow.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {/* Apartment thumbnail */}
                        <div className="w-9 h-9 rounded-md overflow-hidden bg-muted shrink-0 border border-border">
                          {escrow.apartment?.image_urls?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={escrow.apartment.image_urls[0]}
                              alt={escrow.apartment.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {escrow.apartment?.name ?? "Unknown property"}
                          </p>
                          {escrow.apartment?.address && (
                            <p className="text-xs text-muted-foreground">
                              {[escrow.apartment.address.neighborhood, escrow.apartment.address.city]
                                .filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-emerald-600">
                      ${Number(escrow.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <EscrowStatusBadge status={normalizeStatus(escrow.status)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(escrow.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/escrow/${escrow.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
            <p>Showing {filtered.length} of {total}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page === 0}
                onClick={() => setPage(p => p - 1)}>←</Button>
              <span className="px-2">Page {page + 1}</span>
              <Button variant="outline" size="sm"
                disabled={(page + 1) * ITEMS_PER_PAGE >= total}
                onClick={() => setPage(p => p + 1)}>→</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}