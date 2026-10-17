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
import { friendlyHotelError, hotelQueryContext, resolveUseMocks } from "@/lib/hotel-access";
import { useHotelRole } from "@/hooks/use-hotel-role";

/** Evaluated once per bundle: opt-in, never in production. */
const USE_MOCKS = resolveUseMocks();

export type UseHotelDashboardDataReturn = {
  rooms: HotelRoom[];
  reservations: HotelReservation[];
  escrows: HotelEscrowTransaction[];
  isLoading: boolean;
  /** Friendly, user-facing message — never a raw GraphQL error. */
  error: string | null;
  refetch: () => void;
  usingMocks: boolean;
  /** True when the signed-in user's token grants no hotel role. */
  noHotelAccess: boolean;
};

/**
 * Hotel industry dashboard data from the hotel_industry Hasura source.
 *
 * Rows are scoped by Hasura permissions to hotels owned by the signed-in
 * manager (role hotel_manager) or every hotel (role admin). Mock data loads
 * only with NEXT_PUBLIC_USE_HOTEL_MOCKS=true outside production.
 */
export function useHotelDashboardData(): UseHotelDashboardDataReturn {
  const { role, loading: roleLoading } = useHotelRole();

  const [mockLoading, setMockLoading] = useState(USE_MOCKS);
  const [mockRooms, setMockRooms] = useState<HotelRoom[]>([]);
  const [mockReservations, setMockReservations] = useState<HotelReservation[]>([]);
  const [mockEscrows, setMockEscrows] = useState<HotelEscrowTransaction[]>([]);

  const skip = USE_MOCKS || !role;
  const context = role ? hotelQueryContext(role) : undefined;

  const roomsQuery = useQuery(GET_HOTEL_ROOMS, { skip, context, notifyOnNetworkStatusChange: true });
  const reservationsQuery = useQuery(GET_ACTIVE_RESERVATIONS, { skip, context, notifyOnNetworkStatusChange: true });
  const escrowsQuery = useQuery(GET_HOTEL_ESCROW_TRANSACTIONS, { skip, context, notifyOnNetworkStatusChange: true });

  const loadMocks = useCallback(() => {
    if (!USE_MOCKS) return;
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

  const { refetch: refetchRooms } = roomsQuery;
  const { refetch: refetchReservations } = reservationsQuery;
  const { refetch: refetchEscrows } = escrowsQuery;

  const refetch = useCallback(() => {
    if (USE_MOCKS) {
      loadMocks();
      return;
    }
    if (!role) return;
    void refetchRooms();
    void refetchReservations();
    void refetchEscrows();
  }, [loadMocks, role, refetchRooms, refetchReservations, refetchEscrows]);

  if (USE_MOCKS) {
    return {
      rooms: mockRooms,
      reservations: mockReservations,
      escrows: mockEscrows,
      isLoading: mockLoading,
      error: null,
      refetch,
      usingMocks: true,
      noHotelAccess: false,
    };
  }

  if (roleLoading || !role) {
    return {
      rooms: [],
      reservations: [],
      escrows: [],
      isLoading: roleLoading,
      error: null,
      refetch,
      usingMocks: false,
      noHotelAccess: !roleLoading && !role,
    };
  }

  const isLoading =
    (roomsQuery.loading && !roomsQuery.data) ||
    (reservationsQuery.loading && !reservationsQuery.data) ||
    (escrowsQuery.loading && !escrowsQuery.data);

  const error = friendlyHotelError(roomsQuery.error ?? reservationsQuery.error ?? escrowsQuery.error);

  return {
    rooms: (roomsQuery.data?.rooms as HotelRoom[] | undefined) ?? [],
    reservations: (reservationsQuery.data?.reservations as HotelReservation[] | undefined) ?? [],
    escrows:
      (escrowsQuery.data?.hotel_escrow_transactions as HotelEscrowTransaction[] | undefined) ?? [],
    isLoading,
    error,
    refetch,
    usingMocks: false,
    noHotelAccess: false,
  };
}