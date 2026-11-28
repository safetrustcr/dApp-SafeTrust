/**
 * Routing compatibility for legacy mock-hotel links.
 *
 * The early hotel mock used numeric ids while the canonical apartment/escrow
 * domain uses database UUIDs; this map keeps shared /hotel/:id links and old
 * mock cards resolving to the canonical route.
 *
 * The demo apartment fixtures (STUB_APARTMENTS / getStubApartmentById) that
 * used to live here were removed with the typed listing model (issue #521):
 * stub data must never feed live pages, and no test in the repo imports them.
 */

const LEGACY_HOTEL_APARTMENT_IDS: Readonly<Record<string, string>> = {
  '1': '550e8400-e29b-41d4-a716-446655440001',
  '2': '550e8400-e29b-41d4-a716-446655440002',
};

const KNOWN_CANONICAL_IDS = new Set(Object.values(LEGACY_HOTEL_APARTMENT_IDS));

export function canonicalApartmentRouteId(id: string): string | null {
  if (KNOWN_CANONICAL_IDS.has(id)) return id;
  return LEGACY_HOTEL_APARTMENT_IDS[id] ?? null;
}
