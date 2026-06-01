import React from "react";
import { Badge } from "@/components/ui/badge";

type EscrowStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "DISPUTED" | "RESOLVED" | "CANCELLED";

interface EscrowStatusBadgeProps {
  status: EscrowStatus | string;
}

export function EscrowStatusBadge({ status }: EscrowStatusBadgeProps) {
  const normalizedStatus = status.toUpperCase() as EscrowStatus;

  let colorClasses = "bg-amber-50 dark:bg-amber-950/20 text-amber-700 border-amber-200 dark:border-amber-900";
  
  switch (normalizedStatus) {
    case "ACTIVE":
      colorClasses = "bg-blue-50 dark:bg-blue-950/20 text-blue-700 border-blue-200 dark:border-blue-900";
      break;
    case "COMPLETED":
      colorClasses = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-200 dark:border-emerald-900";
      break;
    case "DISPUTED":
      colorClasses = "bg-rose-50 dark:bg-rose-950/20 text-rose-700 border-rose-200 dark:border-rose-900";
      break;
    case "RESOLVED":
      colorClasses = "bg-teal-50 dark:bg-teal-950/20 text-teal-700 border-teal-200 dark:border-teal-900";
      break;
    case "CANCELLED":
      colorClasses = "bg-slate-50 dark:bg-slate-950/20 text-slate-700 border-slate-200 dark:border-slate-900";
      break;
    case "PENDING":
    default:
      colorClasses = "bg-amber-50 dark:bg-amber-950/20 text-amber-700 border-amber-200 dark:border-amber-900";
      break;
  }

  return (
    <Badge variant="outline" className={`font-semibold capitalize px-2 py-0.5 text-xs ${colorClasses}`}>
      {status.toLowerCase()}
    </Badge>
  );
}
