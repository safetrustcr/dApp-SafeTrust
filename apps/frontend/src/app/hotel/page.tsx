import { redirect } from "next/navigation";

export default function RemovedHotelRoutePage() {
  // Legacy public URL kept for bookmarks and shared links.
  redirect("/rent");
}
