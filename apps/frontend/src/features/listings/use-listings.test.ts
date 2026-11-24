/**
 * State-machine tests: network failure, 401/403, empty results and an unknown
 * id must stay four distinguishable states, and no failure path can ever
 * resolve to `ready` (which is the only status the hooks map rows under —
 * a failed request therefore returns [] / undefined, never fixtures).
 */

import { describe, expect, it } from "vitest";

import {
  classifyListingError,
  isValidListingId,
  resolveListingState,
  resolveListingsState,
} from "./use-listings";

const networkError = new TypeError("Failed to fetch");
const unauthorizedGraphQLError = {
  graphQLErrors: [
    { message: "JWTExpired", extensions: { code: "invalid-jwt" } },
  ],
};
const forbiddenStatusError = {
  graphQLErrors: [],
  networkError: Object.assign(new Error("Response not successful"), {
    statusCode: 403,
  }),
};

describe("classifyListingError", () => {
  it("classifies transport failures as network", () => {
    expect(classifyListingError(networkError)).toBe("network");
    expect(classifyListingError(new Error("Connection error"))).toBe("network");
    expect(
      classifyListingError({
        graphQLErrors: [{ message: "Could not resolve relationship" }],
      }),
    ).toBe("network");
    expect(
      classifyListingError({
        graphQLErrors: [],
        networkError: Object.assign(new Error("boom"), { statusCode: 500 }),
      }),
    ).toBe("network");
  });

  it("classifies 401/403 and Hasura auth errors as unauthorized", () => {
    expect(classifyListingError(unauthorizedGraphQLError)).toBe("unauthorized");
    expect(classifyListingError(forbiddenStatusError)).toBe("unauthorized");
    expect(
      classifyListingError({
        graphQLErrors: [
          { message: "no matches for role", extensions: { code: "permission-denied" } },
        ],
      }),
    ).toBe("unauthorized");
    expect(
      classifyListingError({
        graphQLErrors: [],
        networkError: Object.assign(new Error("Unauthorized"), { statusCode: 401 }),
      }),
    ).toBe("unauthorized");
    expect(
      classifyListingError({ message: "JWTExpired: token is no longer valid" }),
    ).toBe("unauthorized");
  });

  it("treats a missing error as network rather than unauthorized", () => {
    expect(classifyListingError(undefined)).toBe("network");
    expect(classifyListingError(null)).toBe("network");
  });
});

describe("resolveListingsState", () => {
  const base = { loading: false, hasData: true, rowCount: 0 };

  it("returns loading while the request is in flight", () => {
    expect(resolveListingsState({ ...base, loading: true })).toEqual({
      status: "loading",
    });
    expect(resolveListingsState({ loading: false, hasData: false, rowCount: 0 })).toEqual({
      status: "loading",
    });
  });

  it("returns empty for a successful response with zero rows", () => {
    expect(resolveListingsState(base)).toEqual({ status: "empty" });
  });

  it("returns ready only for a successful response with rows", () => {
    expect(resolveListingsState({ ...base, rowCount: 3 })).toEqual({ status: "ready" });
  });

  it("returns an error state (with its code) whenever the request failed", () => {
    expect(
      resolveListingsState({ ...base, loading: true, error: networkError, rowCount: 3 }),
    ).toEqual({ status: "error", error: "network" });
    expect(
      resolveListingsState({ ...base, error: unauthorizedGraphQLError, rowCount: 3 }),
    ).toEqual({ status: "error", error: "unauthorized" });
    expect(resolveListingsState({ ...base, error: forbiddenStatusError })).toEqual({
      status: "error",
      error: "unauthorized",
    });
  });

  it("never resolves to ready (or any success state) on failure", () => {
    for (const error of [networkError, unauthorizedGraphQLError, forbiddenStatusError]) {
      const state = resolveListingsState({ ...base, error, rowCount: 10 });
      expect(["ready", "empty"]).not.toContain(state.status);
      expect(state.status).toBe("error");
    }
  });
});

describe("resolveListingState", () => {
  const base = { loading: false, hasData: true };

  it("returns not_found for a successful response with no matching row", () => {
    expect(resolveListingState({ ...base, found: false })).toEqual({
      status: "not_found",
    });
  });

  it("returns ready when the row is present", () => {
    expect(resolveListingState({ ...base, found: true })).toEqual({ status: "ready" });
  });

  it("keeps loading distinct from not_found", () => {
    expect(resolveListingState({ loading: true, hasData: false, found: false })).toEqual({
      status: "loading",
    });
  });

  it("keeps unauthorized and network distinct on failure", () => {
    expect(
      resolveListingState({ ...base, error: unauthorizedGraphQLError, found: false }),
    ).toEqual({ status: "error", error: "unauthorized" });
    expect(
      resolveListingState({ ...base, error: forbiddenStatusError, found: false }),
    ).toEqual({ status: "error", error: "unauthorized" });
    expect(resolveListingState({ ...base, error: networkError, found: false })).toEqual({
      status: "error",
      error: "network",
    });
  });
});

describe("the four distinguishable outcome states", () => {
  it("network, unauthorized, empty and not_found all serialize differently", () => {
    const network = resolveListingsState({
      loading: false,
      error: networkError,
      hasData: false,
      rowCount: 0,
    });
    const unauthorized = resolveListingsState({
      loading: false,
      error: forbiddenStatusError,
      hasData: false,
      rowCount: 0,
    });
    const empty = resolveListingsState({
      loading: false,
      hasData: true,
      rowCount: 0,
    });
    const notFound = resolveListingState({
      loading: false,
      hasData: true,
      found: false,
    });

    const serialized = [network, unauthorized, empty, notFound].map((state) =>
      JSON.stringify(state),
    );
    expect(new Set(serialized).size).toBe(4);
    expect(network).toEqual({ status: "error", error: "network" });
    expect(unauthorized).toEqual({ status: "error", error: "unauthorized" });
    expect(empty).toEqual({ status: "empty" });
    expect(notFound).toEqual({ status: "not_found" });
  });

  it("an unknown or malformed id can never resolve to ready", () => {
    expect(isValidListingId("550e8400-e29b-41d4-a716-446655440001")).toBe(true);
    for (const id of ["", "not-a-uuid", "550e8400-e29b-41d4-a716", "42"]) {
      expect(isValidListingId(id)).toBe(false);
      // The hook returns not_found for these without issuing a query; the
      // valid-but-missing id path resolves through resolveListingState below.
    }
    expect(
      resolveListingState({
        loading: false,
        hasData: true,
        found: false,
      }).status,
    ).toBe("not_found");
  });
});
