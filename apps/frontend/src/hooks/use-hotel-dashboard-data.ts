"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import {
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

const useMocks = process.env.NEXT_PUBLIC_USE_HOTEL_MOCKS !== "false";

export type UseHotelDashboardDataReturn = {
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
 * Defaults to mock data until Hasura tracks hotel_industry tables.
 * Set NEXT_PUBLIC_USE_HOTEL_MOCKS=false to use Apollo queries.
 */
export function useHotelDashboardData(): UseHotelDashboardDataReturn {
  const [mockLoading, setMockLoading] = useState(useMocks);
  const [mockRooms, setMockRooms] = useState<HotelRoom[]>([]);
  const [mockReservations, setMockReservations] = useState<HotelReservation[]>(
    [],
  );
  const [mockEscrows, setMockEscrows] = useState<HotelEscrowTransaction[]>([]);

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
    void roomsQuery.refetch();
    void reservationsQuery.refetch();
    void escrowsQuery.refetch();
  }, [loadMocks, roomsQuery, reservationsQuery, escrowsQuery]);

  if (useMocks) {
    return {
      rooms: mockRooms,
      reservations: mockReservations,
      escrows: mockEscrows,
      isLoading: mockLoading,
      error: null,
      refetch,
      usingMocks: true,
    };
  }

  const isLoading =
    (roomsQuery.loading && !roomsQuery.data) ||
    (reservationsQuery.loading && !reservationsQuery.data) ||
    (escrowsQuery.loading && !escrowsQuery.data);

  const error =
    roomsQuery.error?.message ||
    reservationsQuery.error?.message ||
    escrowsQuery.error?.message ||
    null;

  return {
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
