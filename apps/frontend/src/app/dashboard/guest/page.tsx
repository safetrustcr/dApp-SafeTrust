"use client";

import GuestDashboard from "@/components/dashboard/guest/GuestDashboard";
import { HotelHeader } from "@/components/hotel";
import { LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GuestDashboardPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      <HotelHeader />
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          Switch to Host view
        </button>
      </div>
      <GuestDashboard />
    </div>
  );
}
