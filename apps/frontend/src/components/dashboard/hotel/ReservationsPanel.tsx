"use client";

import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HotelReservation } from "@/lib/mockData/hotel-dashboard";

type ReservationsPanelProps = {
  reservations: HotelReservation[];
  isLoading?: boolean;
};

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function ReservationStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        normalized === "CONFIRMED"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
          : normalized === "PENDING"
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      )}
    >
      {normalized}
    </span>
  );
}

function ReservationsSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse rounded-md border border-border/60 p-3"
        >
          <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}

export function ReservationsPanel({
  reservations,
  isLoading,
}: ReservationsPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          Active Reservations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ReservationsSkeleton />
        ) : reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <Calendar className="h-8 w-8 opacity-50" />
            <p className="text-sm">No active reservations</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reservations.map((reservation) => (
              <li
                key={reservation.id}
                className="space-y-2 rounded-md border border-border/60 p-3 dark:border-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-sm font-medium">
                    {reservation.id.slice(0, 8)}
                    {reservation.room?.room_number
                      ? ` · Room ${reservation.room.room_number}`
                      : ""}
                  </p>
                  <ReservationStatusBadge
                    status={reservation.reservation_status}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(reservation.check_in)} –{" "}
                  {formatDate(reservation.check_out)}
                  {reservation.room?.hotel?.name
                    ? ` · ${reservation.room.hotel.name}`
                    : ""}
                </p>
                <p className="text-sm font-medium">
                  {formatPrice(Number(reservation.total_amount))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
