"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import {
  GET_MANAGER_HOTELS,
  GET_ACTIVE_RESERVATIONS,
  GET_HOTEL_ESCROW_TRANSACTIONS,
  GET_HOTEL_ROOMS,
} from "@/graphql/queries/hotel-queries";
import {
  MOCK_ACTIVE_RESERVATIONS,
  MOCK_HOTEL_ESCROW_TRANSACTIONS,
  MOCK_HOTEL_ROOMS,
  type HotelEscrowTransaction,
  type HotelReservation,
  type HotelRoom,
} from "@/lib/mockData/hotel-dashboard";

export type ManagerHotel = {
  id: string;
  name: string;
  address: string;
  location_area: string | null;
  description: string | null;
  rooms_aggregate: { aggregate: { count: number | null } | null };
};

const mockFlagRequested = process.env.NEXT_PUBLIC_USE_HOTEL_MOCKS === "true";
const useMocks = mockFlagRequested && process.env.NODE_ENV !== "production";

if (mockFlagRequested && process.env.NODE_ENV === "production") {
  console.warn("NEXT_PUBLIC_USE_HOTEL_MOCKS is ignored in production.");
}

export type UseHotelDashboardDataReturn = {
  hotels: ManagerHotel[];
  rooms: HotelRoom[];
  reservations: HotelReservation[];
  escrows: HotelEscrowTransaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  usingMocks: boolean;
};

/**
 * Hotel industry dashboard data.
 * Hotel dashboard data is loaded from Hasura unless development mocks are
 * explicitly enabled with NEXT_PUBLIC_USE_HOTEL_MOCKS=true.
 */
export function useHotelDashboardData(): UseHotelDashboardDataReturn {
  const [mockLoading, setMockLoading] = useState(useMocks);
  const [mockRooms, setMockRooms] = useState<HotelRoom[]>([]);
  const [mockReservations, setMockReservations] = useState<HotelReservation[]>(
    [],
  );
  const [mockEscrows, setMockEscrows] = useState<HotelEscrowTransaction[]>([]);

  const hotelsQuery = useQuery(GET_MANAGER_HOTELS, { skip: useMocks });
  const roomsQuery = useQuery(GET_HOTEL_ROOMS, { skip: useMocks });
  const reservationsQuery = useQuery(GET_ACTIVE_RESERVATIONS, {
    skip: useMocks,
  });
  const escrowsQuery = useQuery(GET_HOTEL_ESCROW_TRANSACTIONS, {
    skip: useMocks,
  });

  const loadMocks = useCallback(() => {
    if (!useMocks) return;
    setMockLoading(true);
    const timer = window.setTimeout(() => {
      setMockRooms(MOCK_HOTEL_ROOMS);
      setMockReservations(MOCK_ACTIVE_RESERVATIONS);
      setMockEscrows(MOCK_HOTEL_ESCROW_TRANSACTIONS);
      setMockLoading(false);
    }, 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return loadMocks();
  }, [loadMocks]);

  const refetch = useCallback(() => {
    if (useMocks) {
      loadMocks();
      return;
    }
    void hotelsQuery.refetch();
    void roomsQuery.refetch();
    void reservationsQuery.refetch();
    void escrowsQuery.refetch();
  }, [loadMocks, hotelsQuery, roomsQuery, reservationsQuery, escrowsQuery]);

  if (useMocks) {
    return {
      hotels: [],
      rooms: mockRooms,
      reservations: mockReservations,
      escrows: mockEscrows,
      isLoading: mockLoading,
      error: null,
      refetch,
      usingMocks: true,
    };
  }

  const isLoading = [hotelsQuery, roomsQuery, reservationsQuery, escrowsQuery].some(
    (query) => query.loading && !query.data,
  );

  const error =
    hotelsQuery.error ||
    roomsQuery.error ||
    reservationsQuery.error ||
    escrowsQuery.error
      ? "Unable to load hotel data. Please try again."
      : null;

  return {
    hotels: (hotelsQuery.data?.hotels as ManagerHotel[] | undefined) ?? [],
    rooms: (roomsQuery.data?.rooms as HotelRoom[] | undefined) ?? [],
    reservations:
      (reservationsQuery.data?.reservations as HotelReservation[] | undefined) ??
      [],
    escrows:
      (escrowsQuery.data?.escrow_transactions as
        | HotelEscrowTransaction[]
        | undefined) ?? [],
    isLoading,
    error,
    refetch,
    usingMocks: false,
  };
}
