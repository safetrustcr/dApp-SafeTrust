"use client";

import { useCallback, useEffect, useState } from "react";
import { RoleEscrowDashboard } from "@/components/dashboard/RoleEscrowDashboard";
import type {
  EscrowData,
  NotificationData,
} from "@/components/dashboard/RoleEscrowDashboard";
import {
  fetchMockEscrows,
  generateMockNotifications,
} from "@/lib/mockData";
import { getUserRole } from "@/utils/role-utils";

export function RoleEscrowDashboardPage() {
  const [userRole, setUserRole] = useState<"guest" | "hotel" | "admin">("guest");
  const [escrows, setEscrows] = useState<EscrowData[]>([]);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const role = getUserRole();
      setUserRole(role ?? "guest");
      const escrowData = await fetchMockEscrows();
      setEscrows(escrowData);
      setNotifications(generateMockNotifications(escrowData));
    } catch {
      setError("Failed to load escrow dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <RoleEscrowDashboard
      userRole={userRole}
      escrows={escrows}
      notifications={notifications}
      isLoading={isLoading}
      error={error}
      onRefresh={loadData}
    />
  );
}
