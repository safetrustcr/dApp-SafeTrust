import { redirect } from "next/navigation";

export default function LegacyEscrowDetailPage({ params }: { params: { id: string; escrowId: string } }) {
  redirect(`/escrow/${params.id}/escrow/${params.escrowId}`);
}
