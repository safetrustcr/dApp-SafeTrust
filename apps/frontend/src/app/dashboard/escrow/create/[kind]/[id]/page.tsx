import { redirect } from "next/navigation";

export default async function LegacyBookingPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  redirect(kind === "apartment" ? `/escrow/${id}/escrow/create` : `/escrow/${id}/escrow/create?kind=hotel-room`);
}
