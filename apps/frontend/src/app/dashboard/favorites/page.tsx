import { Heart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Favorites | SafeTrust",
};

export default function FavoritesPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Heart className="h-12 w-12 text-muted-foreground" />
      <p className="text-lg font-semibold text-foreground">
        No saved apartments yet
      </p>
      <p className="text-sm text-muted-foreground">
        Heart any apartment in{" "}
        <Link
          href="/dashboard/guest/suggestions"
          className="text-orange-500 hover:underline"
        >
          Browse apartments
        </Link>{" "}
        to save it here.
      </p>
    </div>
  );
}
