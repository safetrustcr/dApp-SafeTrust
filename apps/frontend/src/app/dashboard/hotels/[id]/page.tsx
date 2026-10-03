"use client";

import { HotelDetailsView } from "@/components/dashboard/hotels/HotelDetailsView";

interface HotelPageProps {
  params: {
    id: string;
  };
}

export default function HotelPage({ params }: HotelPageProps) {
  return <HotelDetailsView hotelId={params.id} />;
}
