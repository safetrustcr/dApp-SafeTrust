/**
 * Mapper tests. Fixtures are shaped like real Hasura responses for
 * GET_ALL_APARTMENTS / GET_HOTEL_LISTINGS at this commit: `numeric` columns as
 * `number | string`, `point` as the implicit-scalar string `"(lat,lng)"`,
 * `jsonb` address as an object, and `geometry(Point,4326)` as GeoJSON.
 *
 * Field sources: docs/frontend-migration/listing-fields.md
 */

import { describe, expect, it } from "vitest";

import { toCoordinates, toListingFromApartment, toListingFromHotel } from "./adapters";
import type { ApartmentQueryRow, HotelQueryRow } from "./model";

const APARTMENT_ROW: ApartmentQueryRow = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  name: "La sabana sur",
  description: "Beautiful apartment in the heart of San José.",
  price: 4058,
  warranty_deposit: 8116,
  is_available: true,
  image_urls: ["/img/room1.png", "/img/room2.png"],
  address: {
    street: "329 Calle santos",
    neighborhood: "Paseo Colón",
    city: "San José",
    country: "Costa Rica",
  },
  coordinates: "(9.9281,-84.0907)",
  owner_id: "GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7X2BC",
  owner: { first_name: "Alberto", last_name: "Casas" },
};

const HOTEL_ROW: HotelQueryRow = {
  room_id: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  price_night: "120.50",
  hotel: {
    name: "Hotel Alyssia",
    address: "Calle 1, Barrio Escalante, San José",
    coordinates: { type: "Point", coordinates: [-84.0833, 9.9333] },
  },
};

describe("toListingFromApartment", () => {
  it("maps real ids, images, address and host", () => {
    const listing = toListingFromApartment(APARTMENT_ROW);

    expect(listing.kind).toBe("apartment");
    expect(listing.id).toBe("550e8400-e29b-41d4-a716-446655440001");
    expect(listing.title).toBe("La sabana sur");
    expect(listing.images).toEqual(["/img/room1.png", "/img/room2.png"]);
    expect(listing.addressLine).toBe("329 Calle santos, Paseo Colón, San José");
    expect(listing.hostName).toBe("Alberto Casas");
  });

  it("keeps the monthly unit and the raw amount (never converts)", () => {
    const listing = toListingFromApartment(APARTMENT_ROW);

    expect(listing.price).toEqual({
      amount: 4058,
      currency: "USD",
      unit: "month",
    });
  });

  it("accepts a numeric column arriving as a string", () => {
    const listing = toListingFromApartment({
      ...APARTMENT_ROW,
      price: "4058.00",
      warranty_deposit: "8116.50",
    });

    expect(listing.price.amount).toBe(4058);
    expect(listing.deposit).toEqual({ amount: 8116.5, currency: "USD" });
  });

  it("maps warranty_deposit to the optional deposit", () => {
    expect(toListingFromApartment(APARTMENT_ROW).deposit).toEqual({
      amount: 8116,
      currency: "USD",
    });
  });

  it("leaves deposit undefined when the source has no value (never 0 or '')", () => {
    for (const warranty_deposit of [null, undefined]) {
      const listing = toListingFromApartment({ ...APARTMENT_ROW, warranty_deposit });
      expect(listing.deposit).toBeUndefined();
      expect(listing.deposit).not.toBe(0);
      expect(listing.deposit).not.toBe("");
    }
  });

  it("parses the point string written by the dApp (first = lat)", () => {
    expect(toListingFromApartment(APARTMENT_ROW).coordinates).toEqual({
      lat: 9.9281,
      lng: -84.0907,
    });
  });

  it("leaves coordinates undefined when absent or unparsable (no defaults)", () => {
    expect(toListingFromApartment({ ...APARTMENT_ROW, coordinates: null }).coordinates)
      .toBeUndefined();
    expect(toListingFromApartment({ ...APARTMENT_ROW, coordinates: "nonsense" }).coordinates)
      .toBeUndefined();
    expect(toListingFromApartment({ ...APARTMENT_ROW }).coordinates).toBeDefined();
  });

  it("reads province only from explicit address keys", () => {
    expect(
      toListingFromApartment({
        ...APARTMENT_ROW,
        address: {
          street: "329 Calle santos",
          neighborhood: "Paseo Colón",
          city: "San José",
          country: "Costa Rica",
          province: "San José",
        },
      }).province,
    ).toBe("San José");

    expect(toListingFromApartment(APARTMENT_ROW).province).toBeUndefined();
  });

  it("leaves hostName undefined when the owner row is not visible", () => {
    expect(toListingFromApartment({ ...APARTMENT_ROW, owner: null }).hostName)
      .toBeUndefined();
    expect(
      toListingFromApartment({ ...APARTMENT_ROW, owner: { first_name: "Alberto" } })
        .hostName,
    ).toBe("Alberto");
    expect(
      toListingFromApartment({ ...APARTMENT_ROW, owner: { first_name: " ", last_name: "" } })
        .hostName,
    ).toBeUndefined();
  });

  it("normalises images: null → [], blank/non-string entries dropped", () => {
    expect(toListingFromApartment({ ...APARTMENT_ROW, image_urls: null }).images).toEqual([]);
    expect(
      toListingFromApartment({ ...APARTMENT_ROW, image_urls: ["  ", "/img/a.png", 42 as never] })
        .images,
    ).toEqual(["/img/a.png"]);
  });

  it("accepts a plain-string address", () => {
    expect(
      toListingFromApartment({ ...APARTMENT_ROW, address: "329 Calle santos, San José" })
        .addressLine,
    ).toBe("329 Calle santos, San José");
  });

  it("throws instead of inventing a missing or zero price", () => {
    expect(() =>
      toListingFromApartment({ ...APARTMENT_ROW, price: null as never }),
    ).toThrow(/price/);
    expect(() => toListingFromApartment({ ...APARTMENT_ROW, price: 0 })).toThrow(/price/);
    expect(() =>
      toListingFromApartment({ ...APARTMENT_ROW, price: "not-a-number" }),
    ).toThrow(/price/);
  });

  it("throws instead of inventing a missing address", () => {
    expect(() => toListingFromApartment({ ...APARTMENT_ROW, address: {} })).toThrow(
      /address/,
    );
    expect(() => toListingFromApartment({ ...APARTMENT_ROW, address: null })).toThrow(
      /address/,
    );
  });
});

describe("toListingFromHotel", () => {
  it("maps the room row: uuid id, hotel title, nightly price", () => {
    const listing = toListingFromHotel(HOTEL_ROW);

    expect(listing.kind).toBe("hotel");
    expect(listing.id).toBe("7c9e6679-7425-40de-944b-e07fc1f90ae7");
    expect(listing.title).toBe("Hotel Alyssia");
    expect(listing.addressLine).toBe("Calle 1, Barrio Escalante, San José");
    expect(listing.price).toEqual({
      amount: 120.5,
      currency: "USD",
      unit: "night",
    });
  });

  it("keeps a numeric price_night as-is (never converted)", () => {
    expect(
      toListingFromHotel({ ...HOTEL_ROW, price_night: 99 }).price.amount,
    ).toBe(99);
  });

  it("parses GeoJSON coordinates as [lng, lat]", () => {
    expect(toListingFromHotel(HOTEL_ROW).coordinates).toEqual({
      lat: 9.9333,
      lng: -84.0833,
    });
    expect(
      toListingFromHotel({
        ...HOTEL_ROW,
        hotel: { ...HOTEL_ROW.hotel!, coordinates: null },
      }).coordinates,
    ).toBeUndefined();
  });

  it("leaves hotel-only fields honestly missing", () => {
    const listing = toListingFromHotel(HOTEL_ROW);

    expect(listing.images).toEqual([]);
    expect(listing.deposit).toBeUndefined();
    expect(listing.hostName).toBeUndefined();
    expect(listing.province).toBeUndefined();
  });

  it("throws instead of inventing a missing nightly price", () => {
    expect(() =>
      toListingFromHotel({ ...HOTEL_ROW, price_night: null as never }),
    ).toThrow(/price_night/);
  });

  it("throws when the row has no hotel relation", () => {
    expect(() =>
      toListingFromHotel({ ...HOTEL_ROW, hotel: null }),
    ).toThrow(/hotel/);
  });
});

describe("toCoordinates", () => {
  it("parses the point literal format", () => {
    expect(toCoordinates("(9.9281,-84.0907)")).toEqual({ lat: 9.9281, lng: -84.0907 });
    expect(toCoordinates(" ( 9.9 , -84.1 ) ")).toEqual({ lat: 9.9, lng: -84.1 });
  });

  it("returns undefined for anything else", () => {
    expect(toCoordinates(undefined)).toBeUndefined();
    expect(toCoordinates(null)).toBeUndefined();
    expect(toCoordinates("")).toBeUndefined();
    expect(toCoordinates("POINT(1 2)")).toBeUndefined();
    expect(toCoordinates({ type: "LineString" })).toBeUndefined();
    expect(toCoordinates({ type: "Point", coordinates: [-84.09] })).toBeUndefined();
  });
});
