import { BookingEscrowOrchestrator } from "@/components/booking/BookingEscrowOrchestrator";

export default function EscrowCreatePage({ params, searchParams }: { params: { id: string }; searchParams: { kind?: string } }) {
  return <BookingEscrowOrchestrator subject={{ kind: searchParams.kind === "hotel-room" ? "hotel-room" : "apartment", id: params.id }} />;
}
