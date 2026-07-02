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
    },
    description: "Cozy apartment near Los Yoses with great transit access.",
  },
] as const;

export type StubApartment = (typeof STUB_APARTMENTS)[number];

export function getStubApartmentById(id: string): StubApartment | undefined {
  return STUB_APARTMENTS.find((apartment) => apartment.id === id);
}
