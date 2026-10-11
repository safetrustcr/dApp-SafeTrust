import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HASURA_CLAIMS_NAMESPACE,
  __resetMockWarningForTests,
  friendlyHotelError,
  hotelQueryContext,
  hotelRoleFromClaims,
  resolveUseMocks,
} from "./hotel-access";

describe("resolveUseMocks", () => {
  afterEach(() => {
    __resetMockWarningForTests();
    vi.restoreAllMocks();
  });

  it("defaults to false when the flag is unset", () => {
    expect(resolveUseMocks(undefined, "development")).toBe(false);
  });

  it.each(["false", "1", "TRUE", "yes", ""])("ignores non-'true' value %j", (flag) => {
    expect(resolveUseMocks(flag, "development")).toBe(false);
  });

  it("enables mocks only for 'true' outside production", () => {
    expect(resolveUseMocks("true", "development")).toBe(true);
    expect(resolveUseMocks("true", "test")).toBe(true);
  });

  it("ignores the flag in production and warns once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveUseMocks("true", "production")).toBe(false);
    expect(resolveUseMocks("true", "production")).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("hotelRoleFromClaims", () => {
  const claims = (roles: unknown) => ({ [HASURA_CLAIMS_NAMESPACE]: { "x-hasura-allowed-roles": roles } });

  it("admin wins over hotel_manager", () => {
    expect(hotelRoleFromClaims(claims(["guest", "hotel_manager", "admin"]))).toBe("admin");
  });

  it("hotel_manager when granted", () => {
    expect(hotelRoleFromClaims(claims(["guest", "hotel_manager"]))).toBe("hotel_manager");
  });

  it("no hotel access for SafeTrust-only users", () => {
    expect(hotelRoleFromClaims(claims(["guest", "host"]))).toBeNull();
  });

  it("no hotel access without Hasura claims", () => {
    expect(hotelRoleFromClaims({})).toBeNull();
    expect(hotelRoleFromClaims(null)).toBeNull();
    expect(hotelRoleFromClaims(claims("admin"))).toBeNull();
  });
});

describe("hotelQueryContext", () => {
  it("requests the role through x-hasura-role", () => {
    expect(hotelQueryContext("hotel_manager")).toEqual({ headers: { "x-hasura-role": "hotel_manager" } });
  });
});

describe("friendlyHotelError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("never returns the raw GraphQL message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const raw = "field 'hotels' not found in type: 'query_root'";
    const shown = friendlyHotelError({ message: raw });
    expect(shown).toBe("Your account doesn't have access to hotel data.");
    expect(shown).not.toContain("query_root");
  });

  it("generic message for other failures", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(friendlyHotelError({ message: "Failed to fetch" })).toBe(
      "We couldn't load your hotel data. Please try again.",
    );
  });

  it("null when there is no error", () => {
    expect(friendlyHotelError(null)).toBeNull();
  });
});