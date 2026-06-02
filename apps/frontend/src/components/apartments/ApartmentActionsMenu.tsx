tsx
"use client";

import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { JSX, memo } from "react";

// ------------------------------------------------------------------
//  Logger abstraction – replace with a dedicated logging library
// ------------------------------------------------------------------
interface Logger {
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const logger: Logger = {
  warn: (...args) => console.warn("[ApartmentActionsMenu]", ...args),
  error: (...args) => console.error("[ApartmentActionsMenu]", ...args),
};

// ------------------------------------------------------------------
//  Public component
// ------------------------------------------------------------------
export interface ApartmentActionsMenuProps {
  /** Positive integer representing the apartment ID. */
  apartmentId: number;
  /** Optional CSS class names to merge. */
  className?: string;
}

/**
 * A button that serves as a trigger for a dropdown of apartment-specific actions.
 *
 * @param props - Component properties
 * @param props.apartmentId - Positive integer identifier of the apartment
 * @param props.className - Optional additional CSS classes
 * @returns A themed button element with a "more horizontal" icon
 * @throws {Error} If `apartmentId` is not a positive integer
 */
export const ApartmentActionsMenu = memo(function ApartmentActionsMenu({
  apartmentId,
  className,
}: ApartmentActionsMenuProps): JSX.Element {
  // ------------------------------------------------------------------
  //  Input validation with strict type & range check
  // ------------------------------------------------------------------
  if (
    typeof apartmentId !== "number" ||
    !Number.isFinite(apartmentId) ||
    !Number.isInteger(apartmentId) ||
    apartmentId <= 0
  ) {
    const message = `apartmentId must be a positive integer, received: ${JSON.stringify(apartmentId)}`;
    logger.error(`Validation failed: ${message}`);
    throw new Error(message);
  }

  // ------------------------------------------------------------------
  //  Render – stable, no memoization needed internally
  // ------------------------------------------------------------------
  return (
    <button
      type="button"
      aria-label={`Actions for apartment ${apartmentId}`}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      <MoreHorizontal className="h-4 w-4" />
    </button>
  );
});

export default ApartmentActionsMenu;