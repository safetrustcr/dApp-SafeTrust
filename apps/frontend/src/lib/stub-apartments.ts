export const STUB_APARTMENTS = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "La sabana sur",
    address: "329 Calle santos, San Jose",
    price: 4058,
    bedrooms: 2,
    bathrooms: 1,
    petFriendly: true,
    owner: {
      name: "Alberto Casas",
      email: "albertoCasas100@gmail.com",
      phone: "+506 64852179",
      id: "demo-owner-uid-002",
    },
    description:
      "Beautiful apartment in the heart of San José with modern amenities and stunning views.",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Los yoses",
    address: "329 Calle santos, San Jose",
    price: 4000,
    bedrooms: 2,
    bathrooms: 1,
    petFriendly: true,
    owner: {
      name: "Maria Lopez",
      email: "maria.lopez@example.com",
      phone: "+506 64852180",
      id: "demo-owner-uid-002",
    },
    description: "Cozy apartment near Los Yoses with great transit access.",
  },
] as const;

export type StubApartment = (typeof STUB_APARTMENTS)[number];

/**
 * The early rent mock used numeric hotel IDs while the apartment/escrow
 * domain uses database UUIDs. Keep this short-lived compatibility map so
 * shared /hotel/:id links and current mock cards reach the canonical route.
 */
const LEGACY_HOTEL_APARTMENT_IDS: Readonly<Record<string, string>> = {
  '1': '550e8400-e29b-41d4-a716-446655440001',
  '2': '550e8400-e29b-41d4-a716-446655440002',
};

export function canonicalApartmentRouteId(id: string): string | null {
  if (getStubApartmentById(id)) return id;
  return LEGACY_HOTEL_APARTMENT_IDS[id] ?? null;
}

export function getStubApartmentById(id: string): StubApartment | undefined {
  return STUB_APARTMENTS.find((apartment) => apartment.id === id);
}
