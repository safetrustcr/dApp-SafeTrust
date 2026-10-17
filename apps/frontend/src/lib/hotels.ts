import type { HotelGeoJSONPoint } from "@safetrust/types";

/**
 * Extracts numeric latitude and longitude from a hotel object,
 * handling GeoJSON Point, flat lat/lng fields, or stringified coordinates.
 */
export function extractCoordinates(hotel?: {
  coordinates?: HotelGeoJSONPoint | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
} | null): { latitude: number; longitude: number } | null {
  if (!hotel) return null;

  if (hotel.latitude !== undefined && hotel.latitude !== null && hotel.latitude !== "" &&
      hotel.longitude !== undefined && hotel.longitude !== null && hotel.longitude !== "") {
    const lat = Number(hotel.latitude);
    const lng = Number(hotel.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  let geo = hotel.coordinates;
  if (!geo) return null;

  if (typeof geo === "string") {
    try {
      geo = JSON.parse(geo);
    } catch {
      return null;
    }
  }

  if (
    typeof geo === "object" &&
    geo !== null &&
    (geo as any).type === "Point" &&
    Array.isArray((geo as any).coordinates) &&
    (geo as any).coordinates.length >= 2
  ) {
    const [lng, lat] = (geo as any).coordinates;
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      return { latitude: latNum, longitude: lngNum };
    }
  }

  return null;
}

/**
 * Formats coordinates for tabular and detail displays (e.g. "9.9281, -84.0907" or "—").
 */
export function formatHotelCoordinates(hotel?: {
  coordinates?: HotelGeoJSONPoint | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
} | null): string {
  const coords = extractCoordinates(hotel);
  if (!coords) return "—";
  return `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
}

/**
 * Formats ISO timestamp to human-readable date and time.
 */
export function formatHotelDate(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
