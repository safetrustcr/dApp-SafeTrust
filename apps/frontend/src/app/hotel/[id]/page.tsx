import { redirect } from "next/navigation";
import { canonicalApartmentRouteId } from "@/lib/stub-apartments";

export default async function RemovedHotelDetailRoutePage({ params }: { params: Promise<{ id: string }> }) {
  // The public rental detail domain is apartment. Preserve old /hotel/:id links.
  const apartmentId = canonicalApartmentRouteId((await params).id);
  redirect(apartmentId ? `/apartment/${apartmentId}` : "/rent");
}
