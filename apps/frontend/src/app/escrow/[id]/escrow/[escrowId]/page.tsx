import EscrowDetailView from "@/components/escrow/EscrowDetailView";

export default function EscrowDetailPage({ params }: { params: { id: string; escrowId: string } }) {
  return <EscrowDetailView params={params} />;
}
