"use client";

import { use } from "react";
import { HotelDetailsView } from "@/components/dashboard/hotels/HotelDetailsView";

interface HotelPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function HotelPage({ params }: HotelPageProps) {
  const { id } = use(params);
  return <HotelDetailsView hotelId={id} />;
}
