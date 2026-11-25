"use client";

import { useState } from "react";
import Link from "next/link";
import { DashboardHeader, type EscrowDashboardStats } from "./DashboardHeader";
import { EscrowsByStatus } from "./EscrowsByStatus";
import { RecentActivity } from "./RecentActivity";
import { QuickActions } from "./QuickActions";
import { EscrowTable } from "./EscrowTable";
import { AnalyticsDashboard } from "./analytics";

type EscrowStatus =
  | "pending"
  | "funded"
  | "check_in_approved"
  | "check_out_approved"
  | "completed"
  | "cancelled";

export interface EscrowData {
  id: string;
  contractId: string;
  status: EscrowStatus;
  amount: number;
  asset: {
    code: string;
    issuer?: string;
  };
  metadata?: {
    bookingId: string;
    hotelName: string;
    checkInDate: string;
    checkOutDate: string;
    guestName?: string;
    guestEmail?: string;
    roomNumber?: string;
  };
  nextMilestone?: string;
  milestones?: Milestone[];
  marker: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationData {
  id: string;
  type: "milestone" | "payment" | "alert";
  message: string;
  timestamp: string;
  read: boolean;
  escrowId?: string;
  /** `pending_action` = something the user can do now; `event` = something that happened. */
  kind?: "event" | "pending_action";
  href?: string;
  txUrl?: string;
}

const EMPTY_NOTIFICATIONS: NotificationData[] = [];

export interface Milestone {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed" | "rejected";
  dueDate?: string;
  completedAt?: string;
}

const formatNotificationTimestamp = (timestamp: string) => {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

interface RoleEscrowDashboardProps {
  userRole: "guest" | "hotel" | "admin";
  escrows?: EscrowData[];
  totalEscrows?: number;
  notifications?: NotificationData[];
  /** Set when the notifications could not be loaded; shown instead of an empty state. */
  notificationsError?: string | null;
  isLoading?: boolean;
  error?: string | null;
  statsError?: string | null;
  onRefresh?: () => void;
  dashboardStats?: EscrowDashboardStats | null;
  isLoadingStats?: boolean;
}

export function RoleEscrowDashboard({
  userRole,
  escrows = [],
  totalEscrows,
  notifications = EMPTY_NOTIFICATIONS,
  notificationsError = null,
  isLoading = false,
  error = null,
  statsError = null,
  onRefresh,
  dashboardStats = null,
  isLoadingStats = false,
}: RoleEscrowDashboardProps) {
  const [showAnalytics, setShowAnalytics] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary dark:border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <div className="text-red-500 mb-4">{error}</div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <div className="max-w-8xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <DashboardHeader
            userRole={userRole}
            notifications={notifications}
            showAnalytics={showAnalytics}
            onToggleAnalytics={() => setShowAnalytics((prev) => !prev)}
            stats={dashboardStats}
            isLoadingStats={isLoadingStats}
            statsError={statsError}
          />
        </div>


        {/* Analytics Panel (toggled from the header) */}
        {showAnalytics && (
          <div className="mb-6">
            <AnalyticsDashboard />
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Status Overview */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Escrow Status Overview
                </h2>
              </div>
              <div className="p-4">
                <EscrowsByStatus escrows={escrows} userRole={userRole} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Recent Activity
                </h2>
              </div>
              <div className="p-4">
                <RecentActivity escrows={escrows} />
              </div>
            </div>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  Quick Actions
                </h2>
              </div>
              <div className="p-4">
                <QuickActions userRole={userRole} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-semibold flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  Notifications
                  {notifications.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                      {notifications.length}
                    </span>
                  )}
                </h2>
              </div>
              <div className="p-4">
                {notifications.length > 0 ? (
                  <div className="space-y-3">
                    {notifications.slice(0, 3).map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                      />
                    ))}
                    {notifications.length > 3 && (
                      <div className="text-center">
                        <button className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                          View all notifications
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p
                      className={
                        notificationsError
                          ? "text-sm text-red-600 dark:text-red-400"
                          : "text-sm text-gray-500 dark:text-gray-400"
                      }
                    >
                      {notificationsError
                        ? "Notifications could not be loaded. Retrying…"
                        : "No new notifications"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              Recent Transactions
            </h2>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 flex items-center">
              View All
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
          <div className="overflow-x-auto">
            <EscrowTable escrows={escrows} userRole={userRole} />
          </div>
        </div>
      </div>
    </div>
  );
}

const NOTIFICATION_ICON_PATH: Record<NotificationData["type"], string> = {
  payment:
    "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  milestone:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  alert:
    "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
};

const NOTIFICATION_ICON_COLOR: Record<NotificationData["type"], string> = {
  payment: "text-blue-500",
  milestone: "text-green-500",
  alert: "text-amber-500",
};

function NotificationRow({ notification }: { notification: NotificationData }) {
  const content = (
    <div className="flex items-start">
      <div className="flex-shrink-0 mt-0.5">
        <svg
          className={`h-5 w-5 ${NOTIFICATION_ICON_COLOR[notification.type]}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={NOTIFICATION_ICON_PATH[notification.type]}
          />
        </svg>
      </div>
      <div className="ml-3 flex-1">
        {notification.kind === "pending_action" && (
          <span className="mb-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            Action needed
          </span>
        )}
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {formatNotificationTimestamp(notification.timestamp)}
        </p>
      </div>
    </div>
  );

  return (
    <div
      className={`p-3 rounded-lg ${
        notification.read ? "bg-gray-50 dark:bg-gray-700" : "bg-blue-50 dark:bg-gray-700/80"
      }`}
      data-testid="dashboard-notification"
    >
      {notification.href ? (
        <Link href={notification.href} className="block">
          {content}
        </Link>
      ) : (
        content
      )}
      {notification.txUrl && (
        <a
          href={notification.txUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 ml-8 inline-block text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          View transaction
        </a>
      )}
    </div>
  );
}
