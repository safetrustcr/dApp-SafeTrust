import EscrowDetailView from "@/components/escrow/EscrowDetailView";

export default function EscrowDetailPage({ params, searchParams }: { params: { id: string; escrowId: string }; searchParams: { kind?: string } }) {
  return <EscrowDetailView params={params} bookingKind={searchParams.kind === "hotel-room" ? "hotel-room" : "apartment"} />;
}
