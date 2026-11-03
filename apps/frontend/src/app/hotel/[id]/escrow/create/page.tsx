import { redirect } from "next/navigation";
import { canonicalApartmentRouteId } from "@/lib/stub-apartments";

export default async function RemovedHotelEscrowCreateRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const apartmentId = canonicalApartmentRouteId((await params).id);
  redirect(apartmentId ? `/escrow/${apartmentId}/escrow/create` : "/rent");
}
