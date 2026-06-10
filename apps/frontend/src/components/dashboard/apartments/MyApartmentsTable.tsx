"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@apollo/client";
import { toast } from "sonner";
import {
  Plus, Search, Home, MapPin, DollarSign,
  Trash2, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useGlobalAuthenticationStore } from "@/core/store/data";
import {
  GET_APARTMENTS,
  DELETE_APARTMENT,
} from "../../../graphql/queries/apartment-queries";

const ITEMS_PER_PAGE = 5;

interface Apartment {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  warranty_deposit: number;
  is_available: boolean;
  image_urls?: string[] | null;
  address: {
    street?: string;
    neighborhood?: string;
    city?: string;
    country?: string;
  };
  available_from: string;
  available_until?: string | null;
  created_at: string;
  owner_id: string;
}

export function MyApartmentsTable() {
  const router = useRouter();
  const { address, token } = useGlobalAuthenticationStore();

  // ── Decode owner ID (wallet OR Firebase UID from JWT) ─────────────────────
  const ownerAddress = (() => {
    if (address) return address;

    const activeToken = token || (() => {
      try {
        const raw = typeof window !== "undefined"
          ? localStorage.getItem("safetrust-auth")
          : null;
        return JSON.parse(raw ?? "{}").state?.token ?? null;
      } catch {
        return null;
      }
    })();

    if (!activeToken) return null;
    try {
      const base64 = activeToken.split(".")[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");
      const payload = JSON.parse(atob(base64));
      return payload.user_id || payload.sub || null;
    } catch {
      return null;
    }
  })();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const offset = page * ITEMS_PER_PAGE;

  const { data, loading, error } = useQuery(GET_APARTMENTS, {
    variables: {
      limit: ITEMS_PER_PAGE,
      offset,
      owner_id: ownerAddress ?? undefined,
    },
    skip: !ownerAddress,
  });

  const [deleteApartment] = useMutation(DELETE_APARTMENT, {
    refetchQueries: ["GetApartments", "GetAllApartments"],
    onCompleted: () => toast.success("Apartment removed"),
    onError: () => toast.error("Failed to remove apartment"),
  });

  const apartments: Apartment[] = data?.apartments ?? [];
  const total: number = data?.apartments_aggregate?.aggregate?.count ?? 0;

  const filtered = search
    ? apartments.filter((a) =>
        [a.name, a.address?.city, a.address?.street]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : apartments;

  const handleDelete = (id: string) => {
    if (!confirm("Remove this apartment?")) return;
    deleteApartment({
      variables: { id, deleted_at: new Date().toISOString() },
    });
  };

  const formatAddress = (address: Apartment["address"]) => {
    if (!address) return "—";
    return [address.neighborhood, address.city].filter(Boolean).join(", ") || "—";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Apartments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your rental listings
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/apartments/new")}
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 w-fit"
        >
          <Plus className="h-4 w-4" />
          New Apartment
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apartments..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          {filtered.length} of {total}
        </p>
      </div>

      {/* States */}
      {/*
      {!ownerAddress && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Connect your wallet to see your apartments.
        </p>
      )}
      */}

      {filtered.length === 0 && !loading && !error && (
        <p className="text-muted-foreground">
          No apartments yet — create your first one.
        </p>
      )}

      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive text-center py-8">
          Failed to load apartments — {error.message}
        </p>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Home className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">No apartments yet.</p>
          <Button
            onClick={() => router.push("/dashboard/apartments/new")}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create your first apartment
          </Button>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">No.</TableHead>
                <TableHead>Apartment</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Price / mo</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Images</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((apt, index) => (
                <TableRow key={apt.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="text-muted-foreground text-sm">
                    {offset + index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {/* Image thumbnail */}
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-muted shrink-0 border border-border">
                        {apt.image_urls && apt.image_urls.length > 0 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={apt.image_urls[0]}
                            alt={apt.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{apt.name}</p>
                        {apt.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                            {apt.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                      {formatAddress(apt.address)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm font-semibold text-emerald-600">
                      <DollarSign className="h-3.5 w-3.5" />
                      {apt.price.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    ${apt.warranty_deposit.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        apt.is_available
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {apt.is_available ? "Available" : "Unavailable"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {apt.image_urls?.length ?? 0} image{apt.image_urls?.length !== 1 ? "s" : ""}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="View details"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        onClick={() => router.push(`/dashboard/apartments/${apt.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Remove"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => handleDelete(apt.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {total > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
          <p>Showing {filtered.length} of {total}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </Button>
            <span>Page {page + 1}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={(page + 1) * ITEMS_PER_PAGE >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </Button>
          </div>
          <p>Items per page: {ITEMS_PER_PAGE}</p>
        </div>
      )}
    </div>
  );
}