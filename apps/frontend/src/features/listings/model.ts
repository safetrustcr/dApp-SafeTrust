/**
 * The one typed UI listing model shared by the new listing pages.
 *
 * Field-by-field sources, price-unit rules and the honest "missing" behaviour
 * are documented in docs/frontend-migration/listing-fields.md — keep that
 * matrix in sync when this model changes.
 */

export type ListingKind = "apartment" | "hotel";

export type ListingPrice = {
  /** Raw amount from the source row — never converted or rescaled. */
  amount: number;
  /** ISO currency code. The dApp contract is USD everywhere; never converted. */
  currency: string;
  /** Unit comes from the data contract, never guessed from the amount. */
  unit: "night" | "month";
};

export type ListingCoordinates = {
  lat: number;
  lng: number;
};

export type ListingView = {
  kind: ListingKind;
  id: string;
  title: string;
  /** Empty array when the source has no images — the gallery hides itself. */
  images: string[];
  addressLine: string;
  price: ListingPrice;
  /** Undefined when the source has no deposit — never '' or 0. */
  deposit?: { amount: number; currency: string };
  /** Undefined when absent/unparsable — no default coordinates, ever. */
  coordinates?: ListingCoordinates;
  /** Undefined when the source has no province — hidden, never guessed. */
  province?: string;
  /** Undefined when the owner isn't resolvable — the UI falls back to "Host". */
  hostName?: string;
  /**
   * Auth uid of the owner (apartments only — hotels have no owner source).
   * Drives the message-host flow: without it, messaging actions stay hidden.
   */
  ownerId?: string;
};

// ── Source row types ─────────────────────────────────────────────────────────
//
// These describe the exact selection set of the queries that feed the adapters
// (see graphql/queries/{apartment,hotel}-queries.ts). `@safetrust/graphql`
// currently ships an empty generated file (codegen needs a live Hasura or a
// CODEGEN_SCHEMA_URL stub), so until generated types exist these act as the
// documented row contract — replace them with the generated operation types
// once codegen output is available; do not fork them in parallel.

export type ListingOwnerRow = {
  first_name?: string | null;
  last_name?: string | null;
} | null;

/** jsonb `apartments.address` — writers may add keys we don't map. */
export type ApartmentAddressRow = {
  street?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  province?: string | null;
  state?: string | null;
  country?: string | null;
} | null;

/**
 * A row from GET_APARTMENTS / GET_ALL_APARTMENTS / GET_APARTMENT_BY_ID.
 * `numeric` columns are typed `number | string` because GraphQL numeric
 * scalars may arrive either way; the adapter normalises them.
 */
export type ApartmentQueryRow = {
  id: string;
  name: string;
  price: number | string;
  warranty_deposit?: number | string | null;
  image_urls?: string[] | null;
  address?: unknown;
  /** Hasura `point` (implicit scalar): string "(lat,lng)" — see the matrix. */
  coordinates?: unknown;
  owner?: ListingOwnerRow;
  owner_id?: string | null;
  /** Selected for existing dashboard consumers; not part of ListingView. */
  description?: string | null;
  is_available?: boolean | null;
};

/**
 * A row from GET_HOTEL_LISTINGS / GET_HOTEL_LISTING_BY_ID — the hotel feed
 * roots at `rooms` (see the matrix for why) and joins its hotel, so the row
 * carries a guaranteed per-night price and a unique listing id.
 */
export type HotelQueryRow = {
  room_id: string;
  price_night: number | string;
  hotel?: {
    name: string;
    address?: string | null;
    /** PostGIS geometry(Point,4326): GeoJSON { coordinates: [lng, lat] }. */
    coordinates?: unknown;
  } | null;
};
