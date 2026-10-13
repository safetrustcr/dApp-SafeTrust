import { redirect } from "next/navigation";

/** @deprecated Booking escrow now has one canonical orchestrator route. */
export default function LegacyApartmentEscrowCreatePage({ params }: { params: { id: string } }) {
  redirect(`/escrow/${params.id}/escrow/create`);
}
