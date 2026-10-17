import { redirect } from "next/navigation";
import { canonicalApartmentRouteId } from "@/lib/stub-apartments";

export default function RemovedHotelEscrowDetailRoutePage({
  params,
}: {
  params: { id: string; escrowId: string };
}) {
  const apartmentId = canonicalApartmentRouteId(params.id);
  redirect(apartmentId ? `/escrow/${apartmentId}/escrow/${params.escrowId}` : "/rent");
}
