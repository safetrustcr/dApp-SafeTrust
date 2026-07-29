"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HotelRoomsPanel } from "@/components/dashboard/hotel/HotelRoomsPanel";
import { ReservationsPanel } from "@/components/dashboard/hotel/ReservationsPanel";
import { EscrowTransactionsPanel } from "@/components/dashboard/hotel/EscrowTransactionsPanel";
import { useHotelDashboardData } from "@/hooks/use-hotel-dashboard-data";

export default function HotelDashboardPage() {
  const {
    rooms,
    reservations,
    escrows,
    isLoading,
    error,
    refetch,
    usingMocks,
  } = useHotelDashboardData();

  if (error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <Card className="border-destructive/20 bg-destructive/5 p-8">
          <div className="text-center">
            <h2 className="mb-2 text-xl font-semibold text-destructive">
              Error loading hotel dashboard
            </h2>
            <p className="mb-4 text-muted-foreground">{error}</p>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hotel Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Rooms, active reservations, and escrow status
            {usingMocks ? " (mock data)" : ""}
          </p>
        </div>
        <Button onClick={refetch} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <HotelRoomsPanel rooms={rooms} isLoading={isLoading} />
        <ReservationsPanel
          reservations={reservations}
          isLoading={isLoading}
        />
        <EscrowTransactionsPanel escrows={escrows} isLoading={isLoading} />
      </div>
    </div>
  );
}
