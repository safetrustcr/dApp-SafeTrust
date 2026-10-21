import { redirect } from "next/navigation";
import { canonicalApartmentRouteId } from "@/lib/stub-apartments";

export default function RemovedHotelDetailRoutePage({ params }: { params: { id: string } }) {
  // The public rental detail domain is apartment. Preserve old /hotel/:id links.
  redirect(canonicalApartmentRouteId(params.id) ? `/apartment/${canonicalApartmentRouteId(params.id)}` : "/rent");
}
