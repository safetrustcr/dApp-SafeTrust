"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { RoleEscrowDashboard } from "@/components/dashboard/RoleEscrowDashboard";
import type {
  EscrowData,
  NotificationData,
} from "@/components/dashboard/RoleEscrowDashboard";
import {
  generateMockNotifications,
} from "@/lib/mockData";
import { useGlobalAuthenticationStore } from "@/core/store/data";
import { getUserRole } from "@/utils/role-utils";
import { mapDbStatusToDashboardStatus } from "@/utils/escrow-utils";
import { GET_ESCROWS, GET_ESCROW_DASHBOARD_STATS } from "@/graphql/queries/escrow-queries";

const DASHBOARD_ESCROW_LIMIT = 50;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

type DashboardEscrowStatus = EscrowData["status"];

type EscrowRow = {
  id: string;
  contract_id?: string | null;
  engagement_id?: string | null;
  amount: number | string;
  status?: string | null;
  created_at: string;
  updated_at?: string | null;
  sender_address?: string | null;
  receiver_address?: string | null;
  apartment?: {
    name?: string | null;
    available_from?: string | null;
    available_until?: string | null;
  } | null;
};

type TrustlessWorkEscrowRow = {
  contract_id?: string | null;
  status?: string | null;
  asset_issuer?: string | null;
  marker?: string | null;
  booking_id?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  updated_at?: string | null;
};

type GetEscrowsDashboardQuery = {
  escrows?: EscrowRow[];
  recent_escrows?: EscrowRow[];
  escrows_aggregate?: {
    aggregate?: {
      count?: number | null;
    } | null;
  };
  trustless_work_escrows?: TrustlessWorkEscrowRow[];
};

type EscrowFilter = {
  _and?: Array<EscrowFilter>;
  _or?: Array<{
    sender_address?: { _eq: string };
    receiver_address?: { _eq: string };
  }>;
  updated_at?: { _gte: string };
};

type TrustlessWorkEscrowFilter = {
  _or: Array<{
    marker?: { _eq: string };
    approver?: { _eq: string };
    releaser?: { _eq: string };
    resolver?: { _eq: string };
  }>;
};

type GetEscrowsDashboardVariables = {
  limit: number;
  offset: number;
  where: EscrowFilter;
  recentWhere: EscrowFilter;
  trustlessWorkWhere: TrustlessWorkEscrowFilter;
};

const normalizeWalletAddress = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const getRecentEscrowCutoff = () =>
  new Date(Date.now() - ONE_DAY_IN_MS).toISOString();

const getStoredWalletAddress = () => {
  if (typeof window === "undefined") return null;

  const storedWallet =
    localStorage.getItem("walletAddress") ||
    localStorage.getItem("address-wallet");

  if (!storedWallet) return null;

  try {
    const parsed = JSON.parse(storedWallet);
    return normalizeWalletAddress(
      typeof parsed === "string" ? parsed : parsed?.address,
    );
  } catch {
    return normalizeWalletAddress(storedWallet);
  }
};

const mapEscrowStatus = (status?: string | null): DashboardEscrowStatus => {
  const normalized = status?.toLowerCase();

  switch (normalized) {
    case "funded":
    case "active":
    case "milestone_approved":
      return "funded";
    case "check_in_approved":
      return "check_in_approved";
    case "check_out_approved":
      return "check_out_approved";
    case "completed":
    case "resolved":
      return "completed";
    case "disputed":
    case "cancelled":
      return "cancelled";
    case "pending_signature":
    case "deploying":
    case "created":
    case "pending_funding":
    default:
      return "pending";
  }
};

const mapEscrows = (
  escrows: EscrowRow[] = [],
  trustlessWorkEscrows: TrustlessWorkEscrowRow[] = [],
): EscrowData[] => {
  const trustlessWorkByContractId = new Map(
    trustlessWorkEscrows
      .filter((escrow) => escrow.contract_id)
      .map((escrow) => [escrow.contract_id, escrow]),
  );

  return escrows.map((escrow) => {
    const trustlessWorkEscrow = escrow.contract_id
      ? trustlessWorkByContractId.get(escrow.contract_id)
      : undefined;

    return {
      id: escrow.id,
      contractId: escrow.contract_id ?? escrow.id,
      status: mapEscrowStatus(escrow.status || trustlessWorkEscrow?.status),
      amount: Number(escrow.amount) || 0,
      asset: {
        code: "USDC",
        issuer: trustlessWorkEscrow?.asset_issuer ?? undefined,
      },
      metadata: {
        bookingId:
          escrow.engagement_id ?? trustlessWorkEscrow?.booking_id ?? escrow.id,
        hotelName: escrow.apartment?.name ?? "Unknown apartment",
        checkInDate:
          escrow.apartment?.available_from ??
          trustlessWorkEscrow?.check_in_date ??
          escrow.created_at,
        checkOutDate:
          escrow.apartment?.available_until ??
          trustlessWorkEscrow?.check_out_date ??
          escrow.updated_at ??
          escrow.created_at,
      },
      marker:
        escrow.receiver_address ??
        trustlessWorkEscrow?.marker ??
        escrow.sender_address ??
        "",
      createdAt: escrow.created_at,
      updatedAt:
        escrow.updated_at ??
        trustlessWorkEscrow?.updated_at ??
        escrow.created_at,
    };
  });
};

const notificationTypeByStatus: Record<DashboardEscrowStatus, NotificationData["type"]> = {
  pending: "alert",
  funded: "payment",
  check_in_approved: "milestone",
  check_out_approved: "milestone",
  completed: "milestone",
  cancelled: "alert",
};

const notificationMessageByStatus: Record<DashboardEscrowStatus, string> = {
  pending: "is pending signature",
  funded: "has been funded",
  check_in_approved: "has check-in approved",
  check_out_approved: "has check-out approved",
  completed: "has been completed",
  cancelled: "was cancelled",
};

const deriveNotifications = (escrows: EscrowData[]): NotificationData[] => {
  const now = Date.now();

  return escrows
    .filter((escrow) => {
      const updatedAt = new Date(escrow.updatedAt).getTime();
      return !Number.isNaN(updatedAt) && now - updatedAt <= ONE_DAY_IN_MS;
    })
    .map((escrow) => ({
      id: `${escrow.id}-${escrow.status}-${escrow.updatedAt}`,
      type: notificationTypeByStatus[escrow.status],
      message: `Escrow ${escrow.metadata?.bookingId ?? escrow.id} ${
        notificationMessageByStatus[escrow.status]
      }`,
      timestamp: escrow.updatedAt,
      read: false,
      escrowId: escrow.id,
    }));
};

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
      totalEscrows={data?.escrows_aggregate?.aggregate?.count ?? escrows.length}
      notifications={notifications}
      isLoading={escrowsLoading && !escrowsData}
      error={errorMsg}
      onRefresh={handleRefresh}
      dashboardStats={dashboardStats}
      isLoadingStats={statsLoading}
    />
  );
}

