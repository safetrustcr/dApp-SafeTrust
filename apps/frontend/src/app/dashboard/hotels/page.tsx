"use client";

import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHotelDashboardData } from "@/hooks/use-hotel-dashboard-data";

function HotelRowsSkeleton() {
  return (
    <div aria-label="Loading hotels" className="divide-y divide-border">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="grid animate-pulse gap-3 py-4 sm:grid-cols-4">
          <div className="h-4 w-2/3 rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
          <div className="h-4 w-1/4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export default function HotelsPage() {
  const { hotels, isLoading, error, refetch } = useHotelDashboardData();

  return (
    <main className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hotels</h1>
          <p className="mt-1 text-sm text-muted-foreground">Properties you manage</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/hotels/new">
            <Plus className="mr-2 h-4 w-4" />
            New Hotel
          </Link>
        </Button>
      </header>

      {error ? (
        <section role="alert" className="border-t border-border py-8 text-center">
          <p className="mb-4 text-muted-foreground">{error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </section>
      ) : isLoading ? (
        <HotelRowsSkeleton />
      ) : hotels.length === 0 ? (
        <section className="border-t border-border py-12 text-center">
          <p className="mb-4 text-muted-foreground">No hotels yet</p>
          <Button asChild>
            <Link href="/dashboard/hotels/new">
              <Plus className="mr-2 h-4 w-4" />
              New Hotel
            </Link>
          </Button>
        </section>
      ) : (
        <div className="overflow-x-auto border-y border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="py-3 pr-4 font-medium">Hotel</th>
                <th className="py-3 pr-4 font-medium">Address</th>
                <th className="py-3 pr-4 font-medium">Area</th>
                <th className="py-3 font-medium">Rooms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {hotels.map((hotel) => (
                <tr key={hotel.id}>
                  <td className="py-4 pr-4 font-medium">{hotel.name}</td>
                  <td className="py-4 pr-4 text-muted-foreground">{hotel.address}</td>
                  <td className="py-4 pr-4 text-muted-foreground">{hotel.location_area || "—"}</td>
                  <td className="py-4">{hotel.rooms_aggregate.aggregate?.count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}