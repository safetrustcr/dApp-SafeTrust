"use client";

import { MoreHorizontal } from "lucide-react";

export function ApartmentActionsMenu({ apartmentId }: { apartmentId: string }) {
  return (
    <button
      className="text-orange-500 hover:text-orange-600 transition-colors"
      onClick={() => console.log("actions:", apartmentId)}
      title="Actions"
    >
      <MoreHorizontal className="h-5 w-5" />
    </button>
  );
}
