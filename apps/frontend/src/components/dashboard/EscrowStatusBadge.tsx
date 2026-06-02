"use client";

import { cn } from "@/lib/utils";

export type EscrowStatus =
  | "pending_signature"
  | "funded"
  | "active"
  | "completed"
  | "disputed"
  | "resolved"
  | "cancelled";

const STATUS_STYLES: Record<EscrowStatus, string> = {
  pending_signature: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  funded:            "bg-blue-100   text-blue-800   dark:bg-blue-900   dark:text-blue-300",
  active:            "bg-green-100  text-green-800  dark:bg-green-900  dark:text-green-300",
  completed:         "bg-gray-100   text-gray-800   dark:bg-gray-700   dark:text-gray-300",
  disputed:          "bg-red-100    text-red-800    dark:bg-red-900    dark:text-red-300",
  resolved:          "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  cancelled:         "bg-gray-100   text-gray-500   dark:bg-gray-800   dark:text-gray-400",
};

const STATUS_LABELS: Record<EscrowStatus, string> = {
  pending_signature: "Pending",
  funded:            "Funded",
  active:            "Active",
  completed: "Completed",
  disputed:          "Disputed",
  resolved:          "Resolved",
  cancelled:         "Cancelled",
};

interface EscrowStatusBadgeProps {
  status: EscrowStatus;
  className?: string;
}

export function EscrowStatusBadge({ status, className }: EscrowStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        className
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
