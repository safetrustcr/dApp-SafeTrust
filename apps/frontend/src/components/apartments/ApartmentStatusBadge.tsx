tsx
"use client";

import React, { memo } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Valid apartment occupancy statuses. */
export type ApartmentStatus = "inhabited" | "not_inhabited";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Allowed status values for runtime validation. */
const VALID_STATUSES: ReadonlySet<ApartmentStatus> = new Set([
  "inhabited",
  "not_inhabited",
]);

/** Default status fallback when an invalid or missing value is provided. */
const DEFAULT_STATUS: ApartmentStatus = "not_inhabited";

/** Background and text colour classes per status. */
const STATUS_STYLES: Readonly<
  Record<ApartmentStatus, { bg: string; text: string }>
> = {
  inhabited: { bg: "bg-green-100", text: "text-green-800" },
  not_inhabited: { bg: "bg-gray-100", text: "text-gray-700" },
} as const;

/** Human‑readable labels per status. */
const STATUS_LABELS: Readonly<Record<ApartmentStatus, string>> = {
  inhabited: "Inhabited",
  not_inhabited: "Not Inhabited",
} as const;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates that a value is a known {@link ApartmentStatus}.
 * @param value - The value to check.
 * @returns `true` if the value is valid, `false` otherwise.
 */
function isValidApartmentStatus(value: unknown): value is ApartmentStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as ApartmentStatus);
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === "development") {
      console.info(`[ApartmentStatusBadge] ${message}`, ...args);
    }
    // In production, send to external monitoring system (e.g., Sentry, Datadog)
  },
  warn: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[ApartmentStatusBadge] ${message}`, ...args);
    }
    // Report warning to monitoring service
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ApartmentStatusBadge] ${message}`, ...args);
    // Report error to monitoring service
  },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ApartmentStatusBadgeProps {
  /** The occupancy status of the apartment. */
  status: ApartmentStatus;
  /** Optional additional CSS classes to apply to the badge. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A badge that visually represents the occupancy status of an apartment.
 *
 * @remarks
 * - If `status` is not a known {@link ApartmentStatus}, a fallback
 *   (`not_inhabited`) is rendered and a warning is logged.
 * - The component is memoised to minimise unnecessary re‑renders.
 *
 * @example
 *   <ApartmentStatusBadge status="inhabited" />
 */
export const ApartmentStatusBadge = memo(function ApartmentStatusBadge({
  status,
  className,
}: ApartmentStatusBadgeProps) {
  const safeStatus = isValidApartmentStatus(status) ? status : DEFAULT_STATUS;
  
  if (safeStatus !== status) {
    logger.warn(`Invalid apartment status provided: "${status}". Falling back to default.`);
  }

  const { bg, text } = STATUS_STYLES[safeStatus];
  const label = STATUS_LABELS[safeStatus];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        bg,
        text,
        className
      )}
    >
      {label}
    </span>
  );
});
