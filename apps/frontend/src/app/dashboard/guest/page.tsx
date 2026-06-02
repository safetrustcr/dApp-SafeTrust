"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { ApartmentCard } from "@/components/guest/ApartmentCard";
import { CategoryFilter } from "@/components/guest/CategoryFilter";
import { LocationFilter } from "@/components/guest/LocationFilter";
import { BedroomTabs } from "@/components/guest/BedroomTabs";

// TODO: replace with Hasura query → public.apartments
const STUB_APARTMENTS = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  name: "La sabana sur",
  address: "329 Calle santos, paseo colón, San José",
  price: 4058,
  beds: i === 2 ? 1 : i === 3 ? 3 : 2,
  baths: 1,
  petFriendly: true,
  category: i % 3 === 0 ? "Family" : i % 3 === 1 ? "Students" : "Travelers",
  location: i % 2 === 0 ? "San José" : "Heredia",
  isPromoted: i === 0 || i === 4,
  isFavorite: i === 2,
}));

export default function GuestDashboardPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<string[]>(
    ["Family", "Students"]
  );
  const [locations, setLocations] = useState<string[]>(
    ["San José", "Heredia"]
  );
  const [bedrooms, setBedrooms]   = useState("all");
  const [favorites, setFavorites] = useState<string[]>(["3"]);

  const toggleFavorite = (id: string) =>
    setFavorites((prev) =>
      prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id]
    );

  const filteredApartments = STUB_APARTMENTS.filter((apt) => {
    if (categories.length > 0 && !categories.includes(apt.category)) return false;
    if (locations.length > 0 && !locations.includes(apt.location)) return false;
    if (bedrooms !== "all" && String(apt.beds) !== bedrooms) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Left filters sidebar ── */}
      <aside className="w-64 border-r border-gray-200
                        p-6 space-y-8 shrink-0">
        <CategoryFilter
          selected={categories}
          onChange={setCategories}
        />

        {/* Price range */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">
            Price Range
          </h3>
          <p className="text-sm text-gray-500">
            $ 3,200 - $206,000
          </p>
          {/* TODO: wire real range slider component */}
          <div className="relative h-2 bg-orange-100 rounded-full">
            <div className="absolute inset-y-0 left-[10%]
                            right-[25%] bg-orange-500
                            rounded-full" />
            <div className="absolute top-1/2 left-[10%]
                            -translate-x-1/2 -translate-y-1/2
                            h-4 w-4 rounded-full bg-orange-500
                            border-2 border-white shadow" />
            <div className="absolute top-1/2 left-[75%]
                            -translate-x-1/2 -translate-y-1/2
                            h-4 w-4 rounded-full bg-orange-500
                            border-2 border-white shadow" />
          </div>
        </div>

        <LocationFilter
          selected={locations}
          onChange={setLocations}
        />
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 p-6 space-y-4">

        {/* Header row */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Available for rent in{" "}
              <span className="font-extrabold">
                Costa Rica, San José
              </span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              204 units available
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1
                            text-sm text-gray-500">
              <span>↕ Sort by:</span>
              <span className="text-orange-500 font-medium
                               cursor-pointer">
                Relevance ▾
              </span>
            </div>
            {/* Switch to Host view */}
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 text-sm
                         font-medium text-orange-500
                         hover:text-orange-600 transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Switch to Host view
            </button>
          </div>
        </div>

        {/* Bedroom tabs */}
        <BedroomTabs
          selected={bedrooms}
          onChange={setBedrooms}
        />

        {/* Apartment grid */}
        <div className="grid grid-cols-3 gap-4">
          {filteredApartments.map((apt) => (
            <ApartmentCard
              key={apt.id}
              {...apt}
              isFavorite={favorites.includes(apt.id)}
              onFavoriteToggle={toggleFavorite}
            />
          ))}
        </div>

      </main>
    </div>
  );
}
