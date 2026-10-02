"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client";
import {
  Building2,
  MapPin,
  Globe,
  Clock,
  Calendar,
  ArrowLeft,
  Edit,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GET_HOTEL_BY_ID } from "@/graphql/queries/hotel-queries";
import { formatHotelCoordinates, formatHotelDate } from "@/lib/hotels";
import type { Hotel } from "@safetrust/types";

interface HotelDetailsViewProps {
  hotelId: string;
  initialData?: Hotel | null;
}

export function HotelDetailsView({ hotelId, initialData }: HotelDetailsViewProps) {
  const router = useRouter();

  const { data, loading, error } = useQuery(GET_HOTEL_BY_ID, {
    variables: { id: hotelId },
    skip: Boolean(initialData),
    fetchPolicy: "network-only",
  });

  const hotel: Hotel | null = initialData || data?.hotels_by_pk;

  if (loading && !hotel) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-sm text-muted-foreground">Loading hotel details...</p>
      </div>
    );
  }

  if (error && !hotel) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Failed to load hotel</p>
          <p className="text-sm">{error.message}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/hotels")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Hotels
        </Button>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="text-center py-12 border rounded-lg bg-card/50">
          <p className="text-muted-foreground">Hotel not found.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/dashboard/hotels")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Hotels
          </Button>
        </div>
      </div>
    );
  }

  const coordString = formatHotelCoordinates(hotel);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/hotels")}
            className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Hotels
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{hotel.name}</h1>
          <p className="text-sm text-muted-foreground">Hotel Property Overview</p>
        </div>

        <Button
          onClick={() => router.push(`/dashboard/hotels/${hotel.id}/edit`)}
          data-testid="edit-hotel-btn"
          className="bg-orange-500 hover:bg-orange-600 text-white gap-2 w-fit"
        >
          <Edit className="h-4 w-4" />
          Edit Hotel
        </Button>
      </div>

      {/* Main Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-500" />
            General Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Address */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Address
              </span>
              <div className="flex items-start gap-1.5 text-sm text-foreground">
                <MapPin className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span>{hotel.address}</span>
              </div>
            </div>

            {/* Location Area */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Location Area
              </span>
              <p className="text-sm text-foreground">
                {hotel.location_area || hotel.locationArea || "—"}
              </p>
            </div>

            {/* Coordinates */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Coordinates (WGS 84)
              </span>
              <div className="flex items-center gap-1.5 text-sm font-mono text-foreground">
                <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                <span>{coordString}</span>
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Last Updated
              </span>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{formatHotelDate(hotel.updated_at)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Created At
              </span>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{formatHotelDate(hotel.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {hotel.description && (
            <div className="space-y-1.5 pt-4 border-t border-border">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {hotel.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
