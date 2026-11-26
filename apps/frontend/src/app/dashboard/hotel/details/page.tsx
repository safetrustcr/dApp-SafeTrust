"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Gallery from "@/components/hotels/details/Gallery";
import Information from "@/components/hotels/details/Information";
import Details from "@/components/hotels/details/Details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPublicHotel } from "@/lib/api/listings";
import type { PublicRentalProperty } from "@safetrust/types";

const FALLBACK_IMAGE = "/img/room1.png";

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.ceil((end - start) / 86_400_000);
}

function LoadingState({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex min-h-64 items-center justify-center text-sm text-muted-foreground"
    >
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {label}
    </div>
  );
}

function HotelDetailsContent() {
  const searchParams = useSearchParams();
  const hotelId = searchParams.get("hotelId") ?? "";
  const [hotel, setHotel] = useState<PublicRentalProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    searchParams.get("roomId"),
  );
  const [guests, setGuests] = useState(1);
  const [checkIn, setCheckIn] = useState(searchParams.get("checkIn") ?? "");
  const [checkOut, setCheckOut] = useState(searchParams.get("checkOut") ?? "");

  useEffect(() => {
    const controller = new AbortController();
    if (!hotelId) {
      setError("Choose a hotel from search to see its rooms.");
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    setError("");
    fetchPublicHotel(hotelId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setHotel(result);
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        setError(
          failure instanceof TypeError
            ? "Cannot reach the SafeTrust API. Check that the API server is running."
            : failure instanceof Error
              ? failure.message
              : "Unable to load this hotel.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [hotelId]);

  const rooms = useMemo(() => hotel?.rooms ?? [], [hotel]);
  const selectedRoom = useMemo(
    () =>
      rooms.find((room) => room.id === selectedRoomId) ??
      rooms.find((room) => room.available) ??
      rooms[0],
    [rooms, selectedRoomId],
  );
  const nights = nightsBetween(checkIn, checkOut);
  const canContinue = Boolean(selectedRoom && checkIn && checkOut && nights > 0);

  const paymentHref =
    hotel && selectedRoom && canContinue
      ? `/dashboard/hotel/payment?${new URLSearchParams({
          hotelId: hotel.id,
          roomId: selectedRoom.id,
          checkIn,
          checkOut,
          guests: String(guests),
        }).toString()}`
      : null;

  if (loading) return <LoadingState label="Loading hotel…" />;

  if (error || !hotel) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-destructive/30 p-8 text-center">
        <h1 className="text-xl font-semibold">This hotel is unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error || "Refresh the hotel and try again."}
        </p>
        <Link
          href="/dashboard/hotel/search"
          className="mt-4 inline-block font-semibold text-orange-700 underline dark:text-orange-300"
        >
          Back to hotel search
        </Link>
      </div>
    );
  }

  const images = hotel.images.length
    ? hotel.images
    : selectedRoom?.images.length
      ? selectedRoom.images
      : [FALLBACK_IMAGE];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full md:w-2/3">
        <Gallery images={images} />
      </div>

      <div className="w-full md:w-2/3">
        <Information
          name={hotel.name}
          location={[hotel.address, hotel.city].filter(Boolean).join(", ")}
          price={
            hotel.price === null
              ? "Rate unavailable"
              : `$${hotel.price.toLocaleString()}`
          }
        />
      </div>

      <div className="w-full md:w-2/3">
        <Details
          guests={selectedRoom?.capacity}
          description={hotel.description || "This hotel has not added a description yet."}
        />
      </div>

      <section className="w-full md:w-2/3 rounded-2xl border border-orange-200 bg-card p-5">
        <h2 className="text-lg font-semibold">Choose a room</h2>
        {rooms.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            This hotel has no rooms registered yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {rooms.map((room) => {
              const isSelected = selectedRoom?.id === room.id;
              return (
                <button
                  key={room.id}
                  type="button"
                  disabled={!room.available}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedRoomId(room.id);
                    setGuests((current) =>
                      Math.min(Math.max(current, 1), room.capacity),
                    );
                  }}
                  className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSelected
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30"
                      : "border-border hover:border-orange-300"
                  }`}
                >
                  <span className="block font-semibold">Room {room.number}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Up to {room.capacity} guest{room.capacity === 1 ? "" : "s"}
                  </span>
                  <span className="mt-1 block font-bold text-orange-700 dark:text-orange-300">
                    ${room.price.toLocaleString()}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      / night
                    </span>
                  </span>
                  {!room.available && (
                    <span className="mt-1 block text-xs font-semibold text-destructive">
                      Unavailable
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {rooms.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="details-check-in">
                Check-in
              </label>
              <Input
                id="details-check-in"
                type="date"
                value={checkIn}
                onChange={(event) => setCheckIn(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="details-check-out">
                Check-out
              </label>
              <Input
                id="details-check-out"
                type="date"
                min={checkIn || undefined}
                value={checkOut}
                onChange={(event) => setCheckOut(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="details-guests">
                Guests
              </label>
              <Input
                id="details-guests"
                type="number"
                min={1}
                max={selectedRoom?.capacity ?? 1}
                value={guests}
                onChange={(event) =>
                  setGuests(
                    Math.min(
                      Math.max(Number(event.target.value) || 1, 1),
                      selectedRoom?.capacity ?? 1,
                    ),
                  )
                }
              />
            </div>
          </div>
        )}

        {checkIn && checkOut && nights === 0 && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            Check-out must be after check-in.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {selectedRoom
              ? `Room ${selectedRoom.number}${
                  nights > 0
                    ? ` · ${nights} night${nights === 1 ? "" : "s"} · $${(
                        selectedRoom.price * nights
                      ).toLocaleString()}`
                    : ""
                }`
              : "Select an available room to continue."}
          </p>
          {paymentHref ? (
            <Button asChild>
              <Link href={paymentHref}>Continue to payment</Link>
            </Button>
          ) : (
            <Button disabled>Continue to payment</Button>
          )}
        </div>
      </section>
    </div>
  );
}

export default function HotelPage() {
  return (
    <div className="bg-gray-100 min-h-screen dark:bg-dark-background text-black dark:text-white text-sm">
      <div className="flex flex-col lg:flex-row mt-8">
        <div className="flex-grow p-4 flex flex-col items-center gap-6">
          <Suspense fallback={<LoadingState label="Loading hotel…" />}>
            <HotelDetailsContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
