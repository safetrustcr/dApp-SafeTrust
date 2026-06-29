import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export default function RemovedHotelEscrowLayout({ children }: { children: ReactNode }) {
  notFound();
  return children;
}
