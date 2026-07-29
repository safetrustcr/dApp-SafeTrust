"use client";

import { Hotel } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HotelRoom } from "@/lib/mockData/hotel-dashboard";

type HotelRoomsPanelProps = {
  rooms: HotelRoom[];
  isLoading?: boolean;
};

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function RoomStatusBadge({ available }: { available: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        available
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
          : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      )}
    >
      {available ? "Available" : "Unavailable"}
    </span>
  );
}

function RoomsSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse rounded-md border border-border/60 p-3"
        >
          <div className="mb-2 h-4 w-2/3 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}

export function HotelRoomsPanel({ rooms, isLoading }: HotelRoomsPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Hotel className="h-5 w-5 text-muted-foreground" />
          Hotel Rooms
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <RoomsSkeleton />
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <Hotel className="h-8 w-8 opacity-50" />
            <p className="text-sm">No rooms found</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {rooms.map((room) => (
              <li
                key={room.room_id}
                className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-3 dark:border-border"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium">
                    Room {room.room_number}
                    {room.room_type?.name ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {room.room_type.name}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(Number(room.price_night))}/night · Cap{" "}
                    {room.capacity}
                  </p>
                </div>
                <RoomStatusBadge available={Boolean(room.status)} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
