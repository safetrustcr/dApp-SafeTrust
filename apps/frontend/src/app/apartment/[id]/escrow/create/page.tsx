import { redirect } from "next/navigation";

/** @deprecated Booking escrow now has one canonical orchestrator route. */
export default async function LegacyApartmentEscrowCreatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/escrow/${id}/escrow/create`);
}
