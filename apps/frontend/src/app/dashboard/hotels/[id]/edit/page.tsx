"use client";

import { use } from "react";
import { HotelForm } from "@/components/dashboard/hotels/HotelForm";

interface EditHotelPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function EditHotelPage({ params }: EditHotelPageProps) {
  const { id } = use(params);
  return <HotelForm mode="edit" hotelId={id} />;
}
