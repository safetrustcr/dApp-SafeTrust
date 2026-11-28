import { redirect } from "next/navigation";

export default async function RemovedHotelEscrowDetailRoutePage({
  params,
}: {
  params: Promise<{ id: string; escrowId: string }>;
}) {
  const { id, escrowId } = await params;
  redirect(
    `/escrow/${encodeURIComponent(id)}/escrow/${encodeURIComponent(escrowId)}?kind=hotel-room`,
  );
}
