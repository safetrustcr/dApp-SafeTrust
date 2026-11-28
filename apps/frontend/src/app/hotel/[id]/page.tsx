import { redirect } from "next/navigation";

export default async function RemovedHotelDetailRoutePage({ params }: { params: Promise<{ id: string }> }) {
  // Preserve old /hotel/:id links by opening the hotel booking details page.
  const { id } = await params;
  redirect(`/dashboard/hotel/details?hotelId=${encodeURIComponent(id)}`);
}
