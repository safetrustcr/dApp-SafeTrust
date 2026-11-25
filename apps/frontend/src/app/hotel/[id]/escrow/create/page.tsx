import { redirect } from "next/navigation";

export default async function RemovedHotelEscrowCreateRoutePage({ params }: { params: Promise<{ id: string }> }) {
  // The hotel booking id for escrow is the reservation id.
  const { id } = await params;
  redirect(`/escrow/${encodeURIComponent(id)}/escrow/create?kind=hotel-room`);
}
