"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { ApartmentCard } from "@/components/guest/ApartmentCard";
import { BedroomTabs } from "@/components/guest/BedroomTabs";
import { CategoryFilter } from "@/components/guest/CategoryFilter";
import { LocationFilter } from "@/components/guest/LocationFilter";
import { PriceRangeFilter } from "@/components/guest/PriceRangeFilter";

const STUB_APARTMENTS = Array.from({ length: 9 }, (_, index) => ({
  id: String(index + 1),
  name: index % 3 === 0 ? "La sabana sur" : "Los yoses",
  address: "329 Calle santos, paseo colon, San Jose",
  price: index % 2 === 0 ? 4058 : 4000,
  beds: index % 4 === 1 ? 1 : index % 4 === 3 ? 3 : 2,
  baths: index % 3 === 0 ? 2 : 1,
  petFriendly: index !== 5,
  isPromoted: index === 0 || index === 4,
  imageSrc:
    index % 3 === 0
      ? "/img/room1.png"
      : index % 3 === 1
        ? "/img/room2.png"
        : "/img/hotel/hotel1.jpg",
}));

export default function SuggestionsPage() {
  const [categories, setCategories] = useState<string[]>([
    "Family",
    "Students",
  ]);
  const [locations, setLocations] = useState<string[]>(["San Jose", "Heredia"]);
  const [bedrooms, setBedrooms] = useState("all");
  const [favorites, setFavorites] = useState<string[]>(["3"]);

  const apartments = useMemo(() => {
    if (bedrooms === "all") {
      return STUB_APARTMENTS;
    }

    return STUB_APARTMENTS.filter(
      (apartment) => apartment.beds === Number(bedrooms)
    );
  }, [bedrooms]);

  const toggleFavorite = (id: string) => {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((favoriteId) => favoriteId !== id)
        : [...current, id]
    );
  };

  return (
    <div className="min-h-full bg-white text-gray-950">
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="space-y-8 rounded-lg border border-gray-200 bg-white p-5 lg:min-h-[calc(100vh-10rem)]">
          <CategoryFilter selected={categories} onChange={setCategories} />
          <PriceRangeFilter minPrice={3200} maxPrice={206000} />
          <LocationFilter selected={locations} onChange={setLocations} />
        </aside>

        <main className="space-y-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-950 md:text-3xl">
                Available for rent in{" "}
                <span className="font-extrabold">Costa Rica, San Jose</span>
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                204 units available
              </p>
            </div>

            <button
              type="button"
              className="flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm"
            >
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
              <span>Sort by:</span>
              <span className="font-medium text-orange-500">Relevance</span>
              <ChevronDown className="h-4 w-4 text-orange-500" />
            </button>
          </div>

          <BedroomTabs selected={bedrooms} onChange={setBedrooms} />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {apartments.map((apartment) => (
              <ApartmentCard
                key={apartment.id}
                {...apartment}
                isFavorite={favorites.includes(apartment.id)}
                onFavoriteToggle={toggleFavorite}
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
