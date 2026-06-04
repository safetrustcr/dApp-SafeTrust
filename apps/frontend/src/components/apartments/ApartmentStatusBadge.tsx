"use client";

import { cn } from "@/lib/utils";

type ApartmentStatus = "inhabited" | "not_inhabited";

const STATUS_STYLES: Record<ApartmentStatus, string> = {
  inhabited: "bg-green-100 text-green-700",
  not_inhabited: "bg-gray-800 text-white",
};

const STATUS_LABELS: Record<ApartmentStatus, string> = {
  inhabited: "Inhabited",
  not_inhabited: "Not inhabited",
};

export function ApartmentStatusBadge({ status }: { status: ApartmentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
