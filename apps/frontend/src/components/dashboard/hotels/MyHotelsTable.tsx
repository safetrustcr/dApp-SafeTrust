"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Globe,
  Clock,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GET_HOTELS } from "@/graphql/queries/hotel-queries";
import { deleteHotel, HotelApiError } from "@/lib/api/hotels";
import { formatHotelCoordinates, formatHotelDate } from "@/lib/hotels";
import type { Hotel } from "@safetrust/types";

const ITEMS_PER_PAGE = 10;

interface MyHotelsTableProps {
  initialHotels?: Hotel[];
}

export function MyHotelsTable({ initialHotels }: MyHotelsTableProps) {
  const router = useRouter();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [hotelToDelete, setHotelToDelete] = useState<Hotel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const offset = page * ITEMS_PER_PAGE;

  const { data, loading, error, refetch } = useQuery(GET_HOTELS, {
    variables: {
      limit: ITEMS_PER_PAGE,
      offset,
    },
    fetchPolicy: "cache-and-network",
    skip: Boolean(initialHotels),
  });

  const rawHotels: Hotel[] = initialHotels ?? data?.hotels ?? [];
  const totalCount: number = initialHotels ? initialHotels.length : (data?.hotels_aggregate?.aggregate?.count ?? rawHotels.length);

  // Client-side search filtering across Name, Address, Location Area
  const filteredHotels = search.trim()
    ? rawHotels.filter((hotel) => {
        const query = search.toLowerCase();
        return (
          hotel.name?.toLowerCase().includes(query) ||
          hotel.address?.toLowerCase().includes(query) ||
          hotel.location_area?.toLowerCase().includes(query) ||
          hotel.locationArea?.toLowerCase().includes(query) ||
          hotel.description?.toLowerCase().includes(query)
        );
      })
    : rawHotels;

  const handleDeleteClick = (hotel: Hotel) => {
    setHotelToDelete(hotel);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!hotelToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteHotel(hotelToDelete.id);
      toast.success("Hotel deleted successfully");
      setHotelToDelete(null);
      if (refetch) {
        await refetch();
      }
    } catch (err: any) {
      if (err instanceof HotelApiError && err.status === 409) {
        // Show the blocker message inline in the modal
        setDeleteError(err.message || "Cannot delete hotel because it has dependent rooms or reservations.");
      } else if (err instanceof HotelApiError && err.status === 403) {
        setDeleteError("You do not have permission to delete this hotel.");
      } else {
        setDeleteError(err.message || "Failed to delete hotel");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Hotels</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your hotel properties, locations, and rooms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch && refetch()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => router.push("/dashboard/hotels/new")}
            data-testid="new-hotel-btn"
            className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            New Hotel
          </Button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hotels by name, address, area..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
            data-testid="hotel-search-input"
          />
        </div>
        <p className="text-sm text-muted-foreground whitespace-nowrap">
          Showing {filteredHotels.length} of {totalCount} hotel{totalCount === 1 ? "" : "s"}
        </p>
      </div>

      {/* Error state */}
      {error && !initialHotels && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive space-y-2">
          <p className="font-semibold">Failed to load hotels</p>
          <p className="text-sm">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
            Try again
          </Button>
        </div>
      )}

      {/* Loading state */}
      {loading && !initialHotels && rawHotels.length === 0 && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredHotels.length === 0 && (
        <div className="text-center py-16 border rounded-lg bg-card/50 space-y-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">
              {search ? "No hotels matching search" : "No hotels yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {search
                ? "Try searching for a different term or clear the search input."
                : "Create your first hotel property to start managing rooms, reservations, and escrow."}
            </p>
          </div>
          {!search && (
            <Button
              onClick={() => router.push("/dashboard/hotels/new")}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Create your first hotel
            </Button>
          )}
        </div>
      )}

      {/* Hotel Table */}
      {filteredHotels.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Location Area</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHotels.map((hotel, index) => {
                const coordString = formatHotelCoordinates(hotel);
                const updatedString = formatHotelDate(hotel.updated_at);

                return (
                  <TableRow
                    key={hotel.id}
                    data-testid={`hotel-row-${hotel.id}`}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {offset + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{hotel.name}</div>
                      {hotel.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-xs">
                          {hotel.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground max-w-xs">
                        <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                        <span className="truncate">{hotel.address}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {hotel.location_area || hotel.locationArea || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        {coordString !== "—" && (
                          <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        )}
                        <span>{coordString}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{updatedString}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`view-hotel-${hotel.id}`}
                          onClick={() => router.push(`/dashboard/hotels/${hotel.id}`)}
                          className="h-8 w-8 p-0"
                          title="View Hotel"
                        >
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          <span className="sr-only">View</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`edit-hotel-${hotel.id}`}
                          onClick={() => router.push(`/dashboard/hotels/${hotel.id}/edit`)}
                          className="h-8 w-8 p-0"
                          title="Edit Hotel"
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`delete-hotel-${hotel.id}`}
                          onClick={() => handleDeleteClick(hotel)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete Hotel"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalCount > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {Math.ceil(totalCount / ITEMS_PER_PAGE)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * ITEMS_PER_PAGE >= totalCount}
          >
            Next
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal with Inline Blocker Support */}
      <Dialog
        open={Boolean(hotelToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setHotelToDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent data-testid="delete-hotel-dialog">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Delete Hotel</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-sm text-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{hotelToDelete?.name}</span>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          {/* Inline Blocker / Error Message */}
          {deleteError && (
            <div
              data-testid="delete-blocker-message"
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-sm text-destructive space-y-1 my-2"
            >
              <p className="font-semibold text-xs tracking-wide uppercase">
                Deletion Blocked
              </p>
              <p className="text-sm font-medium">{deleteError}</p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setHotelToDelete(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-testid="confirm-delete-hotel-btn"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Hotel"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
