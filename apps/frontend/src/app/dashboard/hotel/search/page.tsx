"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Image } from "@/components/ui/image";
import { Input } from "@/components/ui/input";
import { useRentalProperties } from "@/hooks/use-rental-properties";
import type { PublicRentalProperty } from "@safetrust/types";

const FALLBACK_IMAGE = "/img/room1.png";

function detailsHref(hotelId: string, checkIn: string, checkOut: string) {
  const query = new URLSearchParams({ hotelId });
  if (checkIn) query.set("checkIn", checkIn);
  if (checkOut) query.set("checkOut", checkOut);
  return `/dashboard/hotel/details?${query.toString()}`;
}

function availableRooms(hotel: PublicRentalProperty) {
  return (hotel.rooms ?? []).filter((room) => room.available);
}

export default function HotelSearch() {
  const { properties, loading, error, refetch } = useRentalProperties("hotel");
  const [location, setLocation] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const hotels = useMemo(() => {
    const needle = locationFilter.trim().toLocaleLowerCase();
    if (!needle) return properties;
    return properties.filter((hotel) =>
      `${hotel.name} ${hotel.address} ${hotel.city}`
        .toLocaleLowerCase()
        .includes(needle),
    );
  }, [properties, locationFilter]);

  return (
    <div className="mt-[20px]">
      <h1 className="text-2xl font-bold">Find hotel to stay</h1>
      <form
        className="mt-6 flex flex-wrap items-end justify-between gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setLocationFilter(location);
        }}
      >
        <div className="flex flex-wrap items-end gap-[10px]">
          <div>
            <label className="mb-3 block" htmlFor="hotel-check-in">
              Check-in
            </label>
            <Input
              id="hotel-check-in"
              type="date"
              className="w-full"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-3 block" htmlFor="hotel-check-out">
              Check-out
            </label>
            <Input
              id="hotel-check-out"
              type="date"
              className="w-full"
              min={checkIn || undefined}
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-3 block" htmlFor="hotel-location">
              Where to
            </label>
            <Input
              id="hotel-location"
              placeholder="San José, San Pedro"
              className="w-full"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
        </div>

        <Button type="submit">Search</Button>
      </form>

      <div className="flex justify-end">
        <span className="text-sky-600 opacity-50 cursor-not-allowed">
          View all
        </span>
      </div>

      {loading && (
        <div
          role="status"
          aria-label="Loading hotels"
          className="mt-8 flex items-center justify-center py-16 text-sm text-muted-foreground"
        >
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading hotels…
        </div>
      )}

      {!loading && error && (
        <div role="alert" className="mt-8 rounded-2xl border border-destructive/30 p-8 text-center">
          <p>We couldn&apos;t load hotels. Try again.</p>
          <button
            type="button"
            onClick={refetch}
            className="mt-3 font-semibold text-orange-700 underline dark:text-orange-300"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && hotels.length === 0 && (
        <div className="mt-8 rounded-2xl border p-10 text-center">
          <p className="text-lg font-semibold">No hotels match this search</p>
          {locationFilter && (
            <button
              type="button"
              onClick={() => {
                setLocation("");
                setLocationFilter("");
              }}
              className="mt-3 font-semibold text-orange-700 underline dark:text-orange-300"
            >
              Clear location
            </button>
          )}
        </div>
      )}

      {!loading && !error && hotels.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {hotels.map((hotel) => {
            const rooms = availableRooms(hotel);
            return (
              <Link
                key={hotel.id}
                href={detailsHref(hotel.id, checkIn, checkOut)}
                aria-label={`View ${hotel.name}`}
                className="group block min-w-0"
              >
                <Card className="h-full overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                  <div className="relative h-48 w-full bg-muted">
                    <Image
                      src={hotel.images[0] ?? FALLBACK_IMAGE}
                      alt={hotel.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="flex justify-between py-2 text-lg font-semibold">
                      {hotel.name}
                      <Heart className="text-rose-400" aria-hidden="true" />
                    </h3>
                    <p className="flex gap-[5px] text-sm text-gray-600">
                      <MapPin className="text-sky-700" size={20} aria-hidden="true" />
                      {[hotel.address, hotel.city].filter(Boolean).join(", ") ||
                        "Location not provided"}
                    </p>
                    <p className="mt-2 py-2 font-bold text-primary">
                      {hotel.price === null
                        ? "Rate unavailable"
                        : `$${hotel.price.toLocaleString()}`}{" "}
                      <span className="text-xs italic text-gray-400">/night</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {rooms.length > 0
                        ? `${rooms.length} room${rooms.length === 1 ? "" : "s"} available`
                        : "No rooms available"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
