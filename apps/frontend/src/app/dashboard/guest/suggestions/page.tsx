"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { ArrowUpDown, ChevronDown, Loader2 } from "lucide-react";
import { ApartmentCard } from "@/components/guest/ApartmentCard";
import { BedroomTabs } from "@/components/guest/BedroomTabs";
import { CategoryFilter } from "@/components/guest/CategoryFilter";
import { LocationFilter } from "@/components/guest/LocationFilter";
import { PriceRangeFilter } from "@/components/guest/PriceRangeFilter";
import { GET_ALL_APARTMENTS } from "@/graphql/queries/apartment-queries";

interface Apartment {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  warranty_deposit: number;
  is_available: boolean;
  image_urls?: string[] | null;
  address: {
    street?: string;
    neighborhood?: string;
    city?: string;
    country?: string;
  };
  owner_id: string;
}

const FALLBACK_IMAGE = "/img/room1.png";

function toApartmentCardProps(apt: Apartment, index: number) {
  return {
    id: apt.id,
    name: apt.name,
    address: [apt.address?.street, apt.address?.neighborhood, apt.address?.city]
      .filter(Boolean)
      .join(", ") || "San José, Costa Rica",
    price: apt.price,
    beds: 2,
    baths: 1,
    petFriendly: true,
    isPromoted: index === 0 || index === 3,
    imageSrc: apt.image_urls?.[0] || FALLBACK_IMAGE,
  };
}

export default function SuggestionsPage() {
  const [categories, setCategories] = useState<string[]>(["Family", "Students"]);
  const [locations, setLocations] = useState<string[]>(["San Jose", "Heredia"]);
  const [bedrooms, setBedrooms] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);

  const { data, loading, error } = useQuery(GET_ALL_APARTMENTS, {
    variables: { limit: 24, offset: 0 },
  });

  const rawApartments: Apartment[] = useMemo(
    () => data?.apartments ?? [],
    [data]
  );

  const total = data?.apartments_aggregate?.aggregate?.count ?? rawApartments.length;

  const apartments = useMemo(() => {
    if (bedrooms === "all") return rawApartments;
    return rawApartments.filter((_, i) => {
      const beds = toApartmentCardProps(_, i).beds;
      return beds === Number(bedrooms);
    });
  }, [rawApartments, bedrooms]);

  const toggleFavorite = (id: string) => {
    setFavorites((curr) =>
      curr.includes(id) ? curr.filter((f) => f !== id) : [...curr, id]
    );
  };

  return (
    <div className="min-h-full bg-background text-foreground">
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        {/* ── Filters sidebar ── */}
        <aside className="space-y-8 rounded-lg border border-border bg-card p-5 lg:min-h-[calc(100vh-10rem)]">
          <CategoryFilter selected={categories} onChange={setCategories} />
          <PriceRangeFilter minPrice={900} maxPrice={20000} />
          <LocationFilter selected={locations} onChange={setLocations} />
        </aside>

        {/* ── Main content ── */}
        <main className="space-y-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Available for rent in{" "}
                <span className="font-extrabold">Costa Rica, San José</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {total} unit{total !== 1 ? "s" : ""} available
              </p>
            </div>

            <button
              type="button"
              className="flex w-fit items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm hover:bg-muted transition-colors"
            >
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <span>Sort by:</span>
              <span className="font-medium text-orange-500">Relevance</span>
              <ChevronDown className="h-4 w-4 text-orange-500" />
            </button>
          </div>

          <BedroomTabs selected={bedrooms} onChange={setBedrooms} />

          {/* States */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          )}

          {error && (
            <p className="py-12 text-center text-sm text-destructive">
              Failed to load apartments — {error.message}
            </p>
          )}

          {!loading && !error && apartments.length === 0 && (
            <div className="py-24 text-center space-y-2">
              <p className="text-lg font-semibold">No apartments found</p>
              <p className="text-sm text-muted-foreground">
                Try adjusting the filters or check back later.
              </p>
            </div>
          )}

          {/* Apartment grid */}
          {!loading && !error && apartments.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {apartments.map((apt, index) => (
                <ApartmentCard
                  key={apt.id}
                  {...toApartmentCardProps(apt, index)}
                  isFavorite={favorites.includes(apt.id)}
                  onFavoriteToggle={toggleFavorite}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}