import React from "react";
import { Info } from "lucide-react";

export function SchemaConstraintsHint() {
  return (
    <div
      data-testid="schema-constraints-hint"
      className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200"
    >
      <div className="flex items-start gap-2.5">
        <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="space-y-1.5">
          <h4 className="font-semibold text-blue-950 dark:text-blue-100">
            Schema constraints (hotel_industry.hotels)
          </h4>
          <ul className="list-disc pl-4 space-y-1 text-xs text-blue-800 dark:text-blue-300">
            <li>
              <span className="font-medium">Name:</span> 1–100 characters (required)
            </li>
            <li>
              <span className="font-medium">Address:</span> 1–200 characters (required)
            </li>
            <li>
              <span className="font-medium">Description:</span> maximum 500 characters
            </li>
            <li>
              <span className="font-medium">Location Area:</span> maximum 100 characters
            </li>
            <li>
              <span className="font-medium">Coordinates:</span> latitude -90 to 90, longitude -180 to 180 (WGS 84, optional; both or neither)
            </li>
          </ul>
          <p className="text-xs text-blue-700/90 dark:text-blue-400/90 italic pt-1">
            Placeholders on coordinate inputs: San José (9.9281, -84.0907). Leaving placeholders untouched does not submit coordinates (saved as null).
          </p>
        </div>
      </div>
    </div>
  );
}
