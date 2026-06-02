"use client";

import { Badge } from "@/components/ui/badge";

type EscrowStatus =
  | "pending_signature"
  | "funded"
  | "active"
  | "completed"
  | "disputed"
  | "resolved"
  | "cancelled";

interface EscrowStatusBadgeProps {
  status: EscrowStatus;
}

const statusConfig: Record<
  EscrowStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending_signature: { label: "Pending", variant: "outline" },
  funded: { label: "Funded", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  disputed: { label: "Disputed", variant: "destructive" },
  resolved: { label: "Resolved", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

export function EscrowStatusBadge({ status }: EscrowStatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: "outline" };
  
  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
  );
}
