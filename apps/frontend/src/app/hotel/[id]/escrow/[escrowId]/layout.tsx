import type { ReactNode } from "react";

export default function RemovedHotelEscrowLayout({ children }: { children: ReactNode }) {
  // The page performs the legacy redirect. This layout must not call notFound
  // first or the redirect can never run.
  return children;
}
