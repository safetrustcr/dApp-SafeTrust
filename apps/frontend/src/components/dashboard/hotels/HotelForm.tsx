"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@apollo/client";
import { toast } from "sonner";
import { Building2, MapPin, AlignLeft, Globe, ArrowLeft, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { validateHotelInput } from "@safetrust/types";
import type { Hotel, HotelInput } from "@safetrust/types";
import { createHotel, updateHotel, HotelApiError } from "@/lib/api/hotels";
import { SchemaConstraintsHint } from "./SchemaConstraintsHint";
import { GET_HOTEL_BY_ID } from "@/graphql/queries/hotel-queries";
import { extractCoordinates, formatHotelDate } from "@/lib/hotels";

interface HotelFormProps {
  mode: "create" | "edit";
  hotelId?: string;
  initialData?: Hotel | null;
}

export function HotelForm({ mode, hotelId, initialData }: HotelFormProps) {
  const router = useRouter();

  // ── Form State ─────────────────────────────────────────────────────────────
  const [name, setName] = useState(initialData?.name ?? "");
  const [address, setAddress] = useState(initialData?.address ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [locationArea, setLocationArea] = useState(
    initialData?.locationArea ?? initialData?.location_area ?? ""
  );
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialData?.updated_at ?? null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Pre-populate when editing from Apollo if initialData wasn't passed ─────
  const { data: queryData, loading: queryLoading, error: queryError } = useQuery(GET_HOTEL_BY_ID, {
    variables: { id: hotelId },
    skip: mode !== "edit" || !hotelId || Boolean(initialData),
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    const hotel = initialData || queryData?.hotels_by_pk;
    if (hotel) {
      setName(hotel.name ?? "");
      setAddress(hotel.address ?? "");
      setDescription(hotel.description ?? "");
      setLocationArea(hotel.location_area ?? hotel.locationArea ?? "");
      setUpdatedAt(hotel.updated_at ?? null);

      const coords = extractCoordinates(hotel);
      if (coords) {
        setLatitude(String(coords.latitude));
        setLongitude(String(coords.longitude));
      } else {
        setLatitude("");
        setLongitude("");
      }
    }
  }, [initialData, queryData]);

  // ── Client-side Validation ──────────────────────────────────────────────────
  const validateForm = (): boolean => {
    // If empty string or unchanged placeholder, treat as null (omitted)
    const latValue = latitude.trim() === "" ? null : Number(latitude.trim());
    const lngValue = longitude.trim() === "" ? null : Number(longitude.trim());

    const inputToValidate: HotelInput = {
      name: name.trim(),
      address: address.trim(),
      description: description.trim() === "" ? null : description.trim(),
      locationArea: locationArea.trim() === "" ? null : locationArea.trim(),
      latitude: latValue,
      longitude: lngValue,
    };

    const result = validateHotelInput(inputToValidate, { isUpdate: mode === "edit" });
    if (!result.valid) {
      setFieldErrors(result.errors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  // ── Submit Handler ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const latVal = latitude.trim() === "" ? null : Number(latitude.trim());
      const lngVal = longitude.trim() === "" ? null : Number(longitude.trim());

      const payload: HotelInput = {
        name: name.trim(),
        address: address.trim(),
        description: description.trim() === "" ? null : description.trim(),
        locationArea: locationArea.trim() === "" ? null : locationArea.trim(),
        latitude: latVal,
        longitude: lngVal,
      };

      if (mode === "create") {
        const created = await createHotel(payload);
        toast.success("Hotel created successfully!");
        router.push("/dashboard/hotels");
      } else {
        if (!hotelId) throw new Error("Hotel ID is missing");
        const updated = await updateHotel(hotelId, payload);
        if (updated.updated_at) {
          setUpdatedAt(updated.updated_at);
        }
        toast.success("Hotel updated successfully!");
        router.push("/dashboard/hotels");
      }
    } catch (err: any) {
      if (err instanceof HotelApiError) {
        if (err.status === 403) {
          setGeneralError("You do not have permission to manage this hotel.");
        } else if (err.status === 409) {
          setGeneralError(err.message || "Conflict: dependent resources exist.");
        } else {
          setGeneralError(err.message || "An error occurred while saving the hotel.");
        }
      } else {
        setGeneralError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === "edit" && queryLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        <p className="text-sm text-muted-foreground">Loading hotel details...</p>
      </div>
    );
  }

  if (mode === "edit" && queryError) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Failed to load hotel</p>
          <p className="text-sm">{queryError.message}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/dashboard/hotels")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Hotels
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === "create" ? "Create New Hotel" : "Edit Hotel"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "create"
              ? "Register a new hotel property under your manager account"
              : "Update details and coordinates for your hotel"}
          </p>
        </div>

        {mode === "edit" && updatedAt && (
          <div
            data-testid="last-updated-badge"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border text-xs text-muted-foreground shrink-0 w-fit"
          >
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Last updated: {formatHotelDate(updatedAt)}</span>
          </div>
        )}
      </div>

      {/* Schema Constraints Hint Box */}
      <SchemaConstraintsHint />

      {/* Error alert */}
      {generalError && (
        <div
          data-testid="hotel-form-error"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {generalError}
        </div>
      )}

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Hotel Information</CardTitle>
          <CardDescription>
            All writes are processed securely through the API. The browser never writes hotel rows directly to Hasura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Hotel Name */}
            <div className="space-y-1.5">
              <Label htmlFor="hotel-name" className="text-sm font-medium">
                Hotel Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="hotel-name"
                  data-testid="hotel-name-input"
                  placeholder="e.g. Gran Hotel Costa Rica"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
                  }}
                  maxLength={100}
                  className={`pl-9 ${fieldErrors.name ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
              </div>
              {fieldErrors.name ? (
                <p data-testid="hotel-name-error" className="text-xs text-destructive">
                  {fieldErrors.name}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">1–100 characters</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="hotel-address" className="text-sm font-medium">
                Address <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="hotel-address"
                  data-testid="hotel-address-input"
                  placeholder="e.g. Avenida Central, Calle 1, San José"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: "" }));
                  }}
                  maxLength={200}
                  className={`pl-9 ${fieldErrors.address ? "border-destructive focus-visible:ring-destructive" : ""}`}
                />
              </div>
              {fieldErrors.address ? (
                <p data-testid="hotel-address-error" className="text-xs text-destructive">
                  {fieldErrors.address}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">1–200 characters</p>
              )}
            </div>

            {/* Location Area */}
            <div className="space-y-1.5">
              <Label htmlFor="hotel-location-area" className="text-sm font-medium">
                Location Area
              </Label>
              <Input
                id="hotel-location-area"
                data-testid="hotel-location-area-input"
                placeholder="e.g. Downtown / Central Valley"
                value={locationArea}
                onChange={(e) => {
                  setLocationArea(e.target.value);
                  if (fieldErrors.locationArea) setFieldErrors((prev) => ({ ...prev, locationArea: "" }));
                }}
                maxLength={100}
                className={fieldErrors.locationArea ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {fieldErrors.locationArea ? (
                <p data-testid="hotel-location-area-error" className="text-xs text-destructive">
                  {fieldErrors.locationArea}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Optional, up to 100 characters</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="hotel-description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="hotel-description"
                data-testid="hotel-description-input"
                placeholder="Brief description of amenities, features, and atmosphere..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: "" }));
                }}
                maxLength={500}
                rows={3}
                className={fieldErrors.description ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                {fieldErrors.description ? (
                  <p data-testid="hotel-description-error" className="text-destructive">
                    {fieldErrors.description}
                  </p>
                ) : (
                  <span>Optional, up to 500 characters</span>
                )}
                <span>{description.length} / 500</span>
              </div>
            </div>

            {/* Coordinates Section */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-orange-500" />
                <h3 className="text-sm font-semibold">Geographic Coordinates (WGS 84)</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Optional coordinates for map positioning. Both latitude and longitude must be provided together, or leave blank to save null.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Latitude */}
                <div className="space-y-1">
                  <Label htmlFor="hotel-latitude" className="text-xs font-medium">
                    Latitude (-90 to 90)
                  </Label>
                  <Input
                    id="hotel-latitude"
                    data-testid="hotel-latitude-input"
                    type="number"
                    step="any"
                    placeholder="9.9281"
                    value={latitude}
                    onChange={(e) => {
                      setLatitude(e.target.value);
                      if (fieldErrors.latitude || fieldErrors.coordinates) {
                        setFieldErrors((prev) => ({ ...prev, latitude: "", coordinates: "" }));
                      }
                    }}
                    className={fieldErrors.latitude || fieldErrors.coordinates ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {fieldErrors.latitude && (
                    <p data-testid="hotel-latitude-error" className="text-xs text-destructive">
                      {fieldErrors.latitude}
                    </p>
                  )}
                </div>

                {/* Longitude */}
                <div className="space-y-1">
                  <Label htmlFor="hotel-longitude" className="text-xs font-medium">
                    Longitude (-180 to 180)
                  </Label>
                  <Input
                    id="hotel-longitude"
                    data-testid="hotel-longitude-input"
                    type="number"
                    step="any"
                    placeholder="-84.0907"
                    value={longitude}
                    onChange={(e) => {
                      setLongitude(e.target.value);
                      if (fieldErrors.longitude || fieldErrors.coordinates) {
                        setFieldErrors((prev) => ({ ...prev, longitude: "", coordinates: "" }));
                      }
                    }}
                    className={fieldErrors.longitude || fieldErrors.coordinates ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {fieldErrors.longitude && (
                    <p data-testid="hotel-longitude-error" className="text-xs text-destructive">
                      {fieldErrors.longitude}
                    </p>
                  )}
                </div>
              </div>

              {fieldErrors.coordinates && (
                <p data-testid="hotel-coordinates-error" className="text-xs text-destructive">
                  {fieldErrors.coordinates}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/hotels")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-testid="hotel-submit-btn"
                disabled={isSubmitting}
                className="bg-orange-500 hover:bg-orange-600 text-white min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : mode === "create" ? (
                  "Create Hotel"
                ) : (
                  "Update Hotel"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
