import { redirect } from "next/navigation";

export default function LegacyBookingPage({ params }: { params: { kind: string; id: string } }) {
  redirect(params.kind === "apartment" ? `/escrow/${params.id}/escrow/create` : `/escrow/${params.id}/escrow/create?kind=hotel-room`);
}
