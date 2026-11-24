import { redirect } from "next/navigation";
import { canonicalApartmentRouteId } from "@/lib/stub-apartments";

export default async function RemovedHotelEscrowDetailRoutePage({
  params,
}: {
  params: Promise<{ id: string; escrowId: string }>;
}) {
  const { id, escrowId } = await params;
  const apartmentId = canonicalApartmentRouteId(id);
  redirect(apartmentId ? `/escrow/${apartmentId}/escrow/${escrowId}` : "/rent");
}
