import EscrowDetailView from "@/components/escrow/EscrowDetailView";

export default async function EscrowDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; escrowId: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const [resolvedParams, { kind }] = await Promise.all([params, searchParams]);
  // Keyed by route identity so a different escrow mounts a fresh view, and a
  // failed action's retry state (cached XDR, idempotency keys) never carries over.
  return <EscrowDetailView key={`${resolvedParams.id}/${resolvedParams.escrowId}`} params={resolvedParams} bookingKind={kind === "hotel-room" ? "hotel-room" : "apartment"} />;
}