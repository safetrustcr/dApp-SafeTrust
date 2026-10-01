"use client";

import { HotelForm } from "@/components/dashboard/hotels/HotelForm";

interface EditHotelPageProps {
  params: {
    id: string;
  };
}

export default function EditHotelPage({ params }: EditHotelPageProps) {
  return <HotelForm mode="edit" hotelId={params.id} />;
}
