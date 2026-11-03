import EscrowDetailView from "@/components/escrow/EscrowDetailView";

export default async function EscrowDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; escrowId: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const [resolvedParams, { kind }] = await Promise.all([params, searchParams]);
  return <EscrowDetailView params={resolvedParams} bookingKind={kind === "hotel-room" ? "hotel-room" : "apartment"} />;
}
