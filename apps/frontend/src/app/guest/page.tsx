import { Suspense } from "react";
import GuestDashboard from "@/components/dashboard/guest/GuestDashboard";

export default function GuestPage() {
  return <Suspense><GuestDashboard /></Suspense>;
}
