/**
 * Mappers from real GraphQL response rows to {@link ListingView}.
 *
 * Contract (enforced by unit tests):
 * - required fields (`id`, `title`, `addressLine`, `price`) throw when the
 *   source lacks them — a row is never padded with demo values;
 * - optional fields are `undefined` when the source has no value, never `''`
 *   or `0`;
 * - the price unit comes from the data contract (month for `apartments.price`,
 *   night for `rooms.price_night`) and amounts are never converted;
 * - missing fields stay missing: no default coordinates, no fake amenities.
 *
 * Sources per field: docs/frontend-migration/listing-fields.md
 */

import type {
  ApartmentAddressRow,
  ApartmentQueryRow,
  HotelQueryRow,
  ListingCoordinates,
  ListingOwnerRow,
  ListingView,
} from "./model";

/**
 * Data-contract currency: there is no per-row currency column in the dApp —
 * the create form labels amounts USD, dashboard panels format USD, and escrow
 * settles in USD/USDC. The adapter labels; it never converts.
 */
const CONTRACT_CURRENCY = "USD";

function contractError(field: string, detail: string): Error {
  return new Error(
    `[listings] required field "${field}" is missing or invalid: ${detail}`,
  );
}

/** Parses a `numeric` column (`number | string`) without inventing a value. */
function toRequiredAmount(
  value: number | string | null | undefined,
  field: string,
): number {
  const amount =
    typeof value === "string" ? Number(value) : value ?? Number.NaN;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw contractError(field, String(value));
  }
  return amount;
}

/** Optional amount: absent → undefined; present but garbage → contract error. */
function toOptionalAmount(
  value: number | string | null | undefined,
  field: string,
): { amount: number; currency: string } | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  return { amount: toRequiredAmount(value, field), currency: CONTRACT_CURRENCY };
}

function toRequiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw contractError(field, String(value));
  }
  return value.trim();
}

/** Images: unusable entries are dropped; no source at all → []. */
function toImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim() !== "",
  );
}

/**
 * `addressLine` from jsonb `apartments.address` or free-text
 * `hotels.address`. Required — throws when the source has nothing usable.
 */
function toAddressLine(address: unknown): string {
  if (typeof address === "string") {
    return toRequiredText(address, "address");
  }
  if (address && typeof address === "object") {
    const row = address as NonNullable<ApartmentAddressRow>;
    const line = [row.street, row.neighborhood, row.city]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter(Boolean)
      .join(", ");
    if (line) return line;
    if (typeof row.country === "string" && row.country.trim()) {
      return row.country.trim();
    }
  }
  throw contractError("address", JSON.stringify(address ?? null));
}

/**
 * `province` only from explicit jsonb keys. The current form writes
 * street/neighborhood/city/country, so this is normally undefined — that is
 * honest; guessing from free text is not.
 */
function toProvince(address: unknown): string | undefined {
  if (!address || typeof address !== "object") return undefined;
  const row = address as NonNullable<ApartmentAddressRow>;
  for (const candidate of [row.province, row.state]) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

const POINT_STRING_RE =
  /^\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/;

/**
 * Coordinates from either real source shape:
 * - `point` (apartments): Hasura implicit scalar, string `"(lat,lng)"` — the
 *   dApp writes `` `(${lat},${lng})` `` (NewApartmentForm), so first = lat;
 * - `geometry(Point,4326)` (hotels): GeoJSON `{ coordinates: [lng, lat] }`.
 * Unparsable → undefined (map hidden); never a default coordinate.
 */
export function toCoordinates(value: unknown): ListingCoordinates | undefined {
  if (value === null || value === undefined) return undefined;

  if (typeof value === "string") {
    const match = POINT_STRING_RE.exec(value.trim());
    if (!match) return undefined;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    return { lat, lng };
  }

  if (typeof value === "object") {
    const geo = value as { type?: unknown; coordinates?: unknown };
    if (
      geo.type === "Point" &&
      Array.isArray(geo.coordinates) &&
      geo.coordinates.length === 2
    ) {
      const [lng, lat] = geo.coordinates;
      if (typeof lng === "number" && typeof lat === "number") {
        return { lat, lng };
      }
    }
  }

  return undefined;
}

/** Owner row → display name; invisible/blank owner → undefined ("Host"). */
function toHostName(owner: ListingOwnerRow): string | undefined {
  if (!owner) return undefined;
  const name = [owner.first_name, owner.last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
  return name || undefined;
}

/**
 * Apartment row → ListingView.
 * Price contract: monthly (`unit: 'month'`), amount raw, currency USD.
 */
export function toListingFromApartment(row: ApartmentQueryRow): ListingView {
  return {
    kind: "apartment",
    id: toRequiredText(row.id, "id"),
    title: toRequiredText(row.name, "name"),
    images: toImages(row.image_urls),
    addressLine: toAddressLine(row.address),
    price: {
      amount: toRequiredAmount(row.price, "price"),
      currency: CONTRACT_CURRENCY,
      unit: "month",
    },
    deposit: toOptionalAmount(row.warranty_deposit, "warranty_deposit"),
    coordinates: toCoordinates(row.coordinates),
    province: toProvince(row.address),
    hostName: toHostName(row.owner ?? null),
    ownerId:
      typeof row.owner_id === "string" && row.owner_id.trim()
        ? row.owner_id.trim()
        : undefined,
  };
}

/**
 * Hotel row → ListingView. The feed roots at `rooms`, so the listing id is
 * `rooms.id` (allowed by the matrix) and the price is that room's nightly
 * rate. Hotels have no deposit, images or owner source — those stay missing.
 * Price contract: per night (`unit: 'night'`).
 */
export function toListingFromHotel(row: HotelQueryRow): ListingView {
  if (!row.hotel) {
    throw contractError("hotel", "row has no hotel relation");
  }
  return {
    kind: "hotel",
    id: toRequiredText(row.room_id, "room_id"),
    title: toRequiredText(row.hotel.name, "hotel.name"),
    images: [],
    addressLine: toAddressLine(row.hotel.address),
    price: {
      amount: toRequiredAmount(row.price_night, "price_night"),
      currency: CONTRACT_CURRENCY,
      unit: "night",
    },
    deposit: undefined,
    coordinates: toCoordinates(row.hotel.coordinates),
    province: toProvince(row.hotel.address),
    hostName: undefined,
    ownerId: undefined,
  };
}
