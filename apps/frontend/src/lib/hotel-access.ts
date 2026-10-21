/**
 * Hotel dashboard access rules (browser side).
 *
 * The browser never decides which hotel data it may read. Hasura enforces that
 * from the signed Firebase ID token: the server puts the allowed roles in the
 * token's Hasura claims, and Hasura rejects any `x-hasura-role` header that
 * isn't listed there. This module only *reads* those claims to pick which of
 * the granted roles to send.
 */

export const HASURA_CLAIMS_NAMESPACE = 'https://hasura.io/jwt/claims';

export type HotelHasuraRole = 'admin' | 'hotel_manager' | 'hotel_staff';

let warnedProductionMocks = false;

/**
 * Mocks are opt-in: only when NEXT_PUBLIC_USE_HOTEL_MOCKS === "true" and the
 * build is not production. In production the flag is ignored with a warning.
 */
export function resolveUseMocks(
  flag: string | undefined = process.env.NEXT_PUBLIC_USE_HOTEL_MOCKS,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (flag !== 'true') return false;
  if (nodeEnv === 'production') {
    if (!warnedProductionMocks) {
      console.warn('[hotel-dashboard] NEXT_PUBLIC_USE_HOTEL_MOCKS=true is ignored in production builds.');
      warnedProductionMocks = true;
    }
    return false;
  }
  return true;
}

/** Test helper: reset the one-time production warning. */
export function __resetMockWarningForTests(): void {
  warnedProductionMocks = false;
}

/**
 * Picks the hotel role to request from the token's verified claims:
 * admin (platform) wins over hotel_manager, then hotel_staff; anything else
 * means no hotel access.
 */
export function hotelRoleFromClaims(claims: Record<string, unknown> | null | undefined): HotelHasuraRole | null {
  const hasura = claims?.[HASURA_CLAIMS_NAMESPACE] as { 'x-hasura-allowed-roles'?: unknown } | undefined;
  const allowed = hasura?.['x-hasura-allowed-roles'];
  if (!Array.isArray(allowed)) return null;
  if (allowed.includes('admin')) return 'admin';
  if (allowed.includes('hotel_manager')) return 'hotel_manager';
  if (allowed.includes('hotel_staff')) return 'hotel_staff';
  return null;
}

/** Hotel staff are intentionally read-only. */
export function canManageHotels(role: HotelHasuraRole | null): boolean {
  return role === 'admin' || role === 'hotel_manager';
}

/** Apollo operation context that requests one of the token's granted roles. */
export function hotelQueryContext(role: HotelHasuraRole): { headers: Record<string, string> } {
  return { headers: { 'x-hasura-role': role } };
}

/**
 * User-facing message for a failed hotel query. Raw GraphQL errors stay in the
 * console; the UI never shows them.
 */
export function friendlyHotelError(error: { message?: string } | null | undefined): string | null {
  if (!error) return null;
  if (typeof console !== 'undefined') console.error('[hotel-dashboard]', error.message ?? error);
  const message = error.message ?? '';
  if (/not found in type|permission|access-denied|not allowed|x-hasura-role/i.test(message)) {
    return "Your account doesn't have access to hotel data.";
  }
  return "We couldn't load your hotel data. Please try again.";
}
