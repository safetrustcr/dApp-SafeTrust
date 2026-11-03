import { BookingEscrowOrchestrator } from "@/components/booking/BookingEscrowOrchestrator";

export default async function EscrowCreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const [{ id }, { kind }] = await Promise.all([params, searchParams]);
  return <BookingEscrowOrchestrator subject={{ kind: kind === "hotel-room" ? "hotel-room" : "apartment", id }} />;
}
