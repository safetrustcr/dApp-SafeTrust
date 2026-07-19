"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@apollo/client";
import { RoleEscrowDashboard } from "@/components/dashboard/RoleEscrowDashboard";
import type {
  EscrowData,
  NotificationData,
} from "@/components/dashboard/RoleEscrowDashboard";
import {
  generateMockNotifications,
} from "@/lib/mockData";
import { getUserRole } from "@/utils/role-utils";
import { mapDbStatusToDashboardStatus } from "@/utils/escrow-utils";
import { GET_ESCROWS, GET_ESCROW_DASHBOARD_STATS } from "@/graphql/queries/escrow-queries";

export function RoleEscrowDashboardPage() {
  const [userRole, setUserRole] = useState<"guest" | "hotel" | "admin">("guest");

  useEffect(() => {
    const role = getUserRole();
    setUserRole(role ?? "guest");
  }, []);

  const {
    data: escrowsData,
    loading: escrowsLoading,
    error: escrowsError,
    refetch: refetchEscrows,
  } = useQuery(GET_ESCROWS, {
    variables: { limit: 100, offset: 0 },
  });

  const {
    data: statsData,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery(GET_ESCROW_DASHBOARD_STATS, {
    variables: { tenant_id: "safetrust" },
    pollInterval: 15000,
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchEscrows().catch(() => {}),
      refetchStats().catch(() => {}),
    ]);
  }, [refetchEscrows, refetchStats]);

  const escrows: EscrowData[] = (escrowsData?.escrows ?? []).map((e: any) => ({
    id: e.id,
    contractId: e.contract_id ?? "",
    status: mapDbStatusToDashboardStatus(e.status),
    amount: Number(e.amount),
    asset: { code: "USDC" },
    metadata: {
      bookingId: e.engagement_id ?? "",
      hotelName: e.apartment?.name ?? "Unknown Property",
      checkInDate: "",
      checkOutDate: "",
    },
    marker: e.receiver_address ?? "",
    createdAt: e.created_at,
    updatedAt: e.updated_at ?? e.created_at,
  }));

  const notifications = generateMockNotifications(escrows);

  const dashboardStats = statsData ? {
    total: statsData.total?.aggregate?.count ?? 0,
    active: statsData.active?.aggregate?.count ?? 0,
    completed: statsData.completed?.aggregate?.count ?? 0,
    totalValue: statsData.total_value?.aggregate?.sum?.amount ?? 0,
  } : null;

  const errorMsg = escrowsError ? escrowsError.message : statsError ? statsError.message : null;

  return (
    <RoleEscrowDashboard
      userRole={userRole}
      escrows={escrows}
      notifications={notifications}
      isLoading={escrowsLoading && !escrowsData}
      error={errorMsg}
      onRefresh={handleRefresh}
      dashboardStats={dashboardStats}
      isLoadingStats={statsLoading}
    />
  );
}

