import { redirect } from "next/navigation";
import { canonicalApartmentRouteId } from "@/lib/stub-apartments";

export default function RemovedHotelEscrowCreateRoutePage({ params }: { params: { id: string } }) {
  const apartmentId = canonicalApartmentRouteId(params.id);
  redirect(apartmentId ? `/escrow/${apartmentId}/escrow/create` : "/rent");
}
