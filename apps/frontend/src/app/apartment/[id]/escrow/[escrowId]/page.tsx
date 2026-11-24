import { redirect } from "next/navigation";

export default async function LegacyEscrowDetailPage({ params }: { params: Promise<{ id: string; escrowId: string }> }) {
  const { id, escrowId } = await params;
  redirect(`/escrow/${id}/escrow/${escrowId}`);
}
