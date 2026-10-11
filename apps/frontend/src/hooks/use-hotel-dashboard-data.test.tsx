import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const useQuery = vi.fn();
vi.mock("@apollo/client", () => ({ useQuery: (...args: unknown[]) => useQuery(...args) }));
vi.mock("@/graphql/queries/hotel-queries", () => ({
  GET_HOTEL_ROOMS: "GET_HOTEL_ROOMS",
  GET_ACTIVE_RESERVATIONS: "GET_ACTIVE_RESERVATIONS",
  GET_HOTEL_ESCROW_TRANSACTIONS: "GET_HOTEL_ESCROW_TRANSACTIONS",
}));
vi.mock("@/lib/mockData/hotel-dashboard", () => ({
  MOCK_HOTEL_ROOMS: [{ room_id: "mock" }],
  MOCK_ACTIVE_RESERVATIONS: [],
  MOCK_HOTEL_ESCROW_TRANSACTIONS: [],
}));
const useHotelRole = vi.fn();
vi.mock("@/hooks/use-hotel-role", () => ({ useHotelRole: () => useHotelRole() }));

import { useHotelDashboardData } from "./use-hotel-dashboard-data";

type QueryResult = { data?: Record<string, unknown>; loading: boolean; error?: { message: string }; refetch: () => void };

function mockQueries(byQuery: Record<string, Partial<QueryResult>>) {
  useQuery.mockImplementation((query: string) => ({
    loading: false,
    refetch: vi.fn(),
    ...(byQuery[query] ?? {}),
  }));
}

beforeEach(() => {
  useQuery.mockReset();
  useHotelRole.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("useHotelDashboardData (mock flag unset → real data)", () => {
  it("queries Hasura with the granted role and returns database rows", () => {
    useHotelRole.mockReturnValue({ role: "hotel_manager", loading: false });
    mockQueries({
      GET_HOTEL_ROOMS: { data: { rooms: [{ room_id: "r1" }] } },
      GET_ACTIVE_RESERVATIONS: { data: { reservations: [{ id: "res1" }] } },
      GET_HOTEL_ESCROW_TRANSACTIONS: { data: { hotel_escrow_transactions: [{ id: "e1" }] } },
    });

    const { result } = renderHook(() => useHotelDashboardData());

    expect(result.current.usingMocks).toBe(false);
    expect(result.current.rooms).toEqual([{ room_id: "r1" }]);
    expect(result.current.reservations).toEqual([{ id: "res1" }]);
    expect(result.current.escrows).toEqual([{ id: "e1" }]);
    for (const call of useQuery.mock.calls) {
      expect(call[1]).toMatchObject({ skip: false, context: { headers: { "x-hasura-role": "hotel_manager" } } });
    }
  });

  it("skips queries and flags noHotelAccess for users without a hotel role", () => {
    useHotelRole.mockReturnValue({ role: null, loading: false });
    mockQueries({});

    const { result } = renderHook(() => useHotelDashboardData());

    expect(result.current.noHotelAccess).toBe(true);
    expect(result.current.rooms).toEqual([]);
    for (const call of useQuery.mock.calls) expect(call[1]).toMatchObject({ skip: true });
  });

  it("is loading while the token claims are being read", () => {
    useHotelRole.mockReturnValue({ role: null, loading: true });
    mockQueries({});
    const { result } = renderHook(() => useHotelDashboardData());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.noHotelAccess).toBe(false);
  });

  it("returns an empty dashboard (not an error) when the manager has no rows", () => {
    useHotelRole.mockReturnValue({ role: "hotel_manager", loading: false });
    mockQueries({
      GET_HOTEL_ROOMS: { data: { rooms: [] } },
      GET_ACTIVE_RESERVATIONS: { data: { reservations: [] } },
      GET_HOTEL_ESCROW_TRANSACTIONS: { data: { hotel_escrow_transactions: [] } },
    });
    const { result } = renderHook(() => useHotelDashboardData());
    expect(result.current.error).toBeNull();
    expect(result.current.rooms).toEqual([]);
  });

  it("replaces raw GraphQL errors with a friendly message", () => {
    useHotelRole.mockReturnValue({ role: "hotel_manager", loading: false });
    mockQueries({ GET_HOTEL_ROOMS: { error: { message: "connect ECONNREFUSED 127.0.0.1:8080" } } });
    const { result } = renderHook(() => useHotelDashboardData());
    expect(result.current.error).toBe("We couldn't load your hotel data. Please try again.");
  });

  it("refetch re-runs all three queries", () => {
    useHotelRole.mockReturnValue({ role: "admin", loading: false });
    const refetches = { a: vi.fn(), b: vi.fn(), c: vi.fn() };
    mockQueries({
      GET_HOTEL_ROOMS: { refetch: refetches.a },
      GET_ACTIVE_RESERVATIONS: { refetch: refetches.b },
      GET_HOTEL_ESCROW_TRANSACTIONS: { refetch: refetches.c },
    });
    const { result } = renderHook(() => useHotelDashboardData());
    result.current.refetch();
    expect(refetches.a).toHaveBeenCalled();
    expect(refetches.b).toHaveBeenCalled();
    expect(refetches.c).toHaveBeenCalled();
  });
});