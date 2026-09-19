import { Suspense } from "react";

import GuestDashboard from "@/components/dashboard/guest/GuestDashboard";

export default function GuestDashboardPage() {
  // GuestDashboard reads the `blocked` search param, which requires a Suspense
  // boundary to avoid opting the whole route into client-side rendering.
  return (
    <Suspense>
      <GuestDashboard />
    </Suspense>
  );
}
