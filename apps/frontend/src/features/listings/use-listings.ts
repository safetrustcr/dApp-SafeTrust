"use client";

/**
 * Listing data hooks — the only sanctioned way the listing UI reads
 * apartment/hotel records.
 *
 * `useListings` / `useListing` keep `loading`, `ready`, `empty`, `not_found`,
 * `unauthorized` and `network` distinguishable, and a failed request always
 * yields an empty result — never fixtures. The state machine and the error
 * classifier are exported as pure functions so unit tests can cover all four
 * failure/absence states without a DOM.
 *
 * Sources: docs/frontend-migration/listing-fields.md
 */

import { useQuery } from "@apollo/client";

import {
  GET_ALL_APARTMENTS,
  GET_APARTMENTS,
  GET_APARTMENT_BY_ID,
} from "@/graphql/queries/apartment-queries";
import {
  GET_HOTEL_LISTINGS,
  GET_HOTEL_LISTING_BY_ID,
} from "@/graphql/queries/hotel-queries";

import { toListingFromApartment, toListingFromHotel } from "./adapters";
import type {
  ApartmentQueryRow,
  HotelQueryRow,
  ListingKind,
  ListingView,
} from "./model";

export type ListingsStatus = "loading" | "ready" | "empty" | "error";
export type ListingStatus = "loading" | "ready" | "not_found" | "error";
/** Two honest buckets: auth failures vs everything else (transport/server). */
export type ListingErrorCode = "unauthorized" | "network";

export type ListingsResult = {
  status: ListingsStatus;
  error?: ListingErrorCode;
  /** [] while loading and on error — fixtures are never returned. */
  items: ListingView[];
};

/** Discriminated so pages can narrow `item`/`error` by checking `status`. */
export type ListingResult =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error"; error: ListingErrorCode }
  | { status: "ready"; item: ListingView };

export type UseListingsParams = {
  kind: ListingKind;
  /** Server-side page size, same as the existing queries (default 20). */
  limit?: number;
  /** Server-side offset, same as the existing queries. */
  offset?: number;
  /** Apartments only: today's owner filter (GET_APARTMENTS). Ignored for hotels. */
  ownerId?: string;
};

const DEFAULT_LIMIT = 20;

/** Both listing PKs are uuid columns, so a non-uuid id can never exist. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidListingId(id: string): boolean {
  return typeof id === "string" && UUID_RE.test(id);
}

// ── Error classification ─────────────────────────────────────────────────────

const UNAUTHORIZED_CODES = new Set([
  "invalid-jwt",
  "jwt-expired",
  "permission-denied",
  "not-in-session",
  "UNAUTHENTICATED",
  "FORBIDDEN",
]);

const UNAUTHORIZED_MESSAGE_RE =
  /unauthenticated|unauthorized|not authenticated|permission denied|forbidden|access denied|jwt|hasura role/i;

const STATUS_CODE_RE = /status code 40[13]\b/i;

type GraphQLErrorLike = {
  message?: unknown;
  extensions?: { code?: unknown };
};

function asGraphQLErrors(error: object): GraphQLErrorLike[] {
  const value = (error as { graphQLErrors?: unknown }).graphQLErrors;
  return Array.isArray(value) ? (value as GraphQLErrorLike[]) : [];
}

function statusCodeOf(value: unknown): number | undefined {
  if (!value || typeof value !== "object") return undefined;
  const status = (value as { statusCode?: unknown }).statusCode;
  return typeof status === "number" ? status : undefined;
}

function messageOf(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const message = (value as { message?: unknown }).message;
  return typeof message === "string" ? message : undefined;
}

/**
 * 401/403 responses and Hasura auth errors → 'unauthorized';
 * every other failure (offline, 5xx, server errors) → 'network'.
 */
export function classifyListingError(error: unknown): ListingErrorCode {
  if (!error || typeof error !== "object") return "network";

  for (const graphQLError of asGraphQLErrors(error)) {
    const code = graphQLError.extensions?.code;
    if (typeof code === "string" && UNAUTHORIZED_CODES.has(code)) {
      return "unauthorized";
    }
    const message = messageOf(graphQLError);
    if (message && UNAUTHORIZED_MESSAGE_RE.test(message)) {
      return "unauthorized";
    }
  }

  const status =
    statusCodeOf(error) ??
    statusCodeOf((error as { networkError?: unknown }).networkError);
  if (status === 401 || status === 403) return "unauthorized";

  const message = messageOf(error);
  if (message && (UNAUTHORIZED_MESSAGE_RE.test(message) || STATUS_CODE_RE.test(message))) {
    return "unauthorized";
  }

  return "network";
}

// ── State resolution (pure, unit-tested) ─────────────────────────────────────

export type QueryStateInput = {
  loading: boolean;
  error?: unknown;
  /** `data !== undefined` — distinguishes "no response yet" from "0 rows". */
  hasData: boolean;
  rowCount: number;
};

export function resolveListingsState(input: QueryStateInput): {
  status: ListingsStatus;
  error?: ListingErrorCode;
} {
  if (input.error) {
    return { status: "error", error: classifyListingError(input.error) };
  }
  if (input.loading || !input.hasData) return { status: "loading" };
  if (input.rowCount === 0) return { status: "empty" };
  return { status: "ready" };
}

export type ListingStateInput = {
  loading: boolean;
  error?: unknown;
  hasData: boolean;
  found: boolean;
};

export type ListingStateResult =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "ready" }
  | { status: "error"; error: ListingErrorCode };

export function resolveListingState(
  input: ListingStateInput,
): ListingStateResult {
  if (input.error) {
    return { status: "error", error: classifyListingError(input.error) };
  }
  if (input.loading || !input.hasData) return { status: "loading" };
  if (!input.found) return { status: "not_found" };
  return { status: "ready" };
}

// ── Row mapping ──────────────────────────────────────────────────────────────

function mapRows(
  kind: ListingKind,
  rows: ApartmentQueryRow[] | HotelQueryRow[] | undefined,
): ListingView[] {
  if (!Array.isArray(rows)) return [];
  return kind === "hotel"
    ? (rows as HotelQueryRow[]).map(toListingFromHotel)
    : (rows as ApartmentQueryRow[]).map(toListingFromApartment);
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Paged listing feed.
 * - `kind: 'apartment'` → `GET_ALL_APARTMENTS` (available units, as today),
 *   or `GET_APARTMENTS` when `ownerId` is given (today's owner filter).
 * - `kind: 'hotel'` → `GET_HOTEL_LISTINGS` (room rows, nightly price).
 * Pagination stays server-side; client-side filters may only touch fields the
 * adapter fills (see the field matrix).
 */
export function useListings(params: UseListingsParams): ListingsResult {
  const { kind, limit = DEFAULT_LIMIT, offset = 0, ownerId } = params;
  const useOwnerFeed = kind === "apartment" && Boolean(ownerId);

  const publicApartments = useQuery<{ apartments: ApartmentQueryRow[] }>(
    GET_ALL_APARTMENTS,
    {
      variables: { limit, offset },
      skip: kind !== "apartment" || useOwnerFeed,
    },
  );
  const ownedApartments = useQuery<{ apartments: ApartmentQueryRow[] }>(
    GET_APARTMENTS,
    {
      variables: { limit, offset, owner_id: ownerId },
      skip: !useOwnerFeed,
    },
  );
  const hotelRooms = useQuery<{ rooms: HotelQueryRow[] }>(
    GET_HOTEL_LISTINGS,
    {
      variables: { limit, offset },
      skip: kind !== "hotel",
    },
  );

  const active =
    kind === "hotel" ? hotelRooms : useOwnerFeed ? ownedApartments : publicApartments;
  const rows =
    active.data === undefined
      ? undefined
      : kind === "hotel"
        ? (active.data as { rooms: HotelQueryRow[] }).rooms
        : (active.data as { apartments: ApartmentQueryRow[] }).apartments;

  const state = resolveListingsState({
    loading: active.loading,
    error: active.error,
    hasData: active.data !== undefined,
    rowCount: rows?.length ?? 0,
  });

  return {
    ...state,
    items: state.status === "ready" ? mapRows(kind, rows) : [],
  };
}

/**
 * Single listing detail.
 * - unknown or non-uuid id → `not_found` without issuing a doomed query;
 * - `not_found` is distinct from `error`, and error codes stay distinct
 *   (`unauthorized` vs `network`).
 */
export function useListing(kind: ListingKind, id: string): ListingResult {
  const validId = isValidListingId(id);

  const apartmentQuery = useQuery<{ apartments: ApartmentQueryRow[] }>(
    GET_APARTMENT_BY_ID,
    { variables: { id }, skip: kind !== "apartment" || !validId },
  );
  const hotelQuery = useQuery<{ rooms: HotelQueryRow[] }>(
    GET_HOTEL_LISTING_BY_ID,
    { variables: { id }, skip: kind !== "hotel" || !validId },
  );

  if (!validId) return { status: "not_found" };

  const active = kind === "hotel" ? hotelQuery : apartmentQuery;
  const row =
    active.data === undefined
      ? undefined
      : kind === "hotel"
        ? (active.data as { rooms: HotelQueryRow[] }).rooms[0]
        : (active.data as { apartments: ApartmentQueryRow[] }).apartments[0];

  const state = resolveListingState({
    loading: active.loading,
    error: active.error,
    hasData: active.data !== undefined,
    found: row !== undefined,
  });

  if (state.status !== "ready") return state;

  return {
    status: "ready",
    item:
      kind === "hotel"
        ? toListingFromHotel(row as HotelQueryRow)
        : toListingFromApartment(row as ApartmentQueryRow),
  };
}
