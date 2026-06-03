import GuestDashboard from "@/components/dashboard/guest/GuestDashboard";
import { HotelHeader } from "@/components/hotel";

export default function GuestDashboardPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <HotelHeader />
      <GuestDashboard />
    </div>
  );
}
