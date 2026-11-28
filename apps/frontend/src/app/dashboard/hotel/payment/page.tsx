"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarClock, Loader2 } from "lucide-react";
import HotelDetails from "@/components/hotels/payment/HotelDetails";
import ReservationSummary from "@/components/hotels/payment/ReservationSummary";
import { Button } from "@/components/ui/button";
import { useGlobalAuthenticationStore } from "@/core/store/data";
import { HotelApiError, createReservation } from "@/lib/api/hotels";
import { fetchPublicHotel } from "@/lib/api/listings";
import type { PublicRentalProperty } from "@safetrust/types";

const FALLBACK_IMAGE = "/img/room1.png";

type CreatedReservation = {
  reservationId: string;
  total: number;
  holdExpiresAt: string;
};

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

function HotelPaymentContent() {
  const searchParams = useSearchParams();
  const hotelId = searchParams.get("hotelId") ?? "";
  const roomId = searchParams.get("roomId") ?? "";
  const checkIn = searchParams.get("checkIn") ?? "";
  const checkOut = searchParams.get("checkOut") ?? "";
  const guestsParam = Number(searchParams.get("guests"));
  const guests =
    Number.isInteger(guestsParam) && guestsParam >= 1 ? guestsParam : 1;

  const walletAddress = useGlobalAuthenticationStore((state) => state.address);
  const [hotel, setHotel] = useState<PublicRentalProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reservation, setReservation] = useState<CreatedReservation | null>(
    null,
  );

  useEffect(() => {
    const controller = new AbortController();
    if (!hotelId) {
      setLoadError("Choose a room from hotel search and try again.");
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    setLoadError("");
    fetchPublicHotel(hotelId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setHotel(result);
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        setLoadError(
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

  const room = useMemo(
    () => hotel?.rooms?.find((item) => item.id === roomId),
    [hotel, roomId],
  );
  const nights = nightsBetween(checkIn, checkOut);
  const estimatedTotal = room ? room.price * nights : undefined;

  const confirmReservation = async () => {
    setSubmitError("");

    if (!room) {
      setSubmitError("Select a room before confirming the reservation.");
      return;
    }
    if (nights <= 0) {
      setSubmitError("Choose a check-out date after the check-in date.");
      return;
    }
    if (!walletAddress) {
      setSubmitError(
        "Connect your Stellar wallet so the reservation can hold your booking deposit.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await createReservation({
        roomId: room.id,
        checkIn,
        checkOut,
        guests,
        walletAddress,
      });
      setReservation(created);
    } catch (failure) {
      setSubmitError(
        failure instanceof HotelApiError
          ? failure.message
          : failure instanceof Error
            ? failure.message
            : "Unable to create the reservation.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState label="Loading reservation…" />;

  if (loadError || !hotel) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-destructive/30 p-8 text-center">
        <h1 className="text-xl font-semibold">This booking is unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {loadError || "Choose a room from hotel search and try again."}
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

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="w-full px-4 md:px-10 py-8">
        <div className="flex flex-col md:flex-row gap-8 max-w-7xl mx-auto">
          <div className="flex-grow">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <HotelDetails
                hotelName={hotel.name}
                description={room ? `Room ${room.number}` : hotel.name}
                details={hotel.description ?? undefined}
                location={[hotel.address, hotel.city].filter(Boolean).join(", ")}
                imageUrl={room?.images[0] ?? hotel.images[0] ?? FALLBACK_IMAGE}
                pricePerNight={room?.price}
              />
            </div>
          </div>
          <div className="w-full md:w-[400px] shrink-0 space-y-4">
            <ReservationSummary
              hotelName={hotel.name}
              description={room ? `Room ${room.number}` : undefined}
              price={room?.price}
              tax={0}
              nights={nights || undefined}
              guests={guests}
              checkIn={checkIn || undefined}
              checkOut={checkOut || undefined}
            />

            <div className="rounded-2xl border border-orange-200 bg-white p-5">
              {reservation ? (
                <div role="status" className="space-y-3">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                    Reservation created
                  </p>
                  <p className="flex items-center gap-2 text-sm text-gray-600">
                    <CalendarClock className="h-4 w-4" aria-hidden="true" />
                    Room held until{" "}
                    {new Date(reservation.holdExpiresAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Reservation total: ${reservation.total.toLocaleString()}
                  </p>
                  <Button asChild className="w-full">
                    <Link
                      href={`/escrow/${encodeURIComponent(
                        reservation.reservationId,
                      )}/escrow/create?kind=hotel-room`}
                    >
                      Continue to secure escrow
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {!walletAddress && (
                    <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                      Connect your Stellar wallet to confirm this reservation.
                    </p>
                  )}
                  {submitError && (
                    <p role="alert" className="text-sm text-destructive">
                      {submitError}
                    </p>
                  )}
                  <Button
                    type="button"
                    className="w-full"
                    disabled={submitting || !room || nights <= 0}
                    onClick={confirmReservation}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating reservation…
                      </>
                    ) : (
                      "Confirm reservation"
                    )}
                  </Button>
                  <p className="text-xs text-gray-500">
                    {estimatedTotal !== undefined && nights > 0
                      ? `Estimated total: $${estimatedTotal.toLocaleString()} for ${nights} night${
                          nights === 1 ? "" : "s"
                        }. `
                      : "Choose valid stay dates to continue. "}
                    Your card is not charged here — the deposit is secured in a
                    Stellar escrow.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const HotelPage = () => (
  <Suspense fallback={<LoadingState label="Loading reservation…" />}>
    <HotelPaymentContent />
  </Suspense>
);

export default HotelPage;
