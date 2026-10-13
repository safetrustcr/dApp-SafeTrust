'use client';

import type { HotelCategory, HotelListing, HotelLocation } from '@/@types/hotel';
import {
  ApartmentGrid,
  BedroomTabs,
  FilterSidebar,
  HotelHeader,
} from '@/components/rent';
// TODO: replace STUB_HOTELS with GET_ALL_APARTMENTS Hasura query (Batch N)
import { STUB_HOTELS } from '@/lib/mockData/hotels';
import { canonicalApartmentRouteId } from '@/lib/stub-apartments';
import {
  filterRentListings,
  toggleFilterValue,
  type SortOption,
} from '@/lib/rent/filterRentListings';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { BsSortDownAlt } from 'react-icons/bs';
import { LayoutGrid, Lightbulb } from 'lucide-react';

export default function RentListingPage() {
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<HotelCategory[]>([
    'Family',
    'Students',
  ]);
  const [selectedLocations, setSelectedLocations] = useState<HotelLocation[]>([
    'San José',
    'Heredia',
  ]);
  const [selectedBedrooms, setSelectedBedrooms] = useState('all');
  const [sortOption] = useState<SortOption>('relevance');
  const [minPrice, setMinPrice] = useState(3200);
  const [maxPrice, setMaxPrice] = useState(206000);

  const filteredApartments = useMemo(
    () =>
      filterRentListings(STUB_HOTELS, {
        selectedCategories,
        selectedLocations,
        selectedBedrooms,
        sortOption,
        minPrice,
        maxPrice,
      }),
    [
      maxPrice,
      minPrice,
      selectedBedrooms,
      selectedCategories,
      selectedLocations,
      sortOption,
    ],
  );

  const handleApartmentClick = (apartment: HotelListing) => {
    const routeId = canonicalApartmentRouteId(apartment.id);
    router.push(
      routeId
        ? `/escrow/${routeId}/escrow/create`
        : `/escrow/${encodeURIComponent(apartment.id)}/escrow/create?kind=hotel-room`,
    );
  };

  const locationLabel =
    selectedLocations.length > 0
      ? `Costa Rica, ${selectedLocations.join(', ')}`
      : 'Costa Rica';
  const unitCount = filteredApartments.length;

  return (
    <div className="min-h-screen bg-white text-[#1c1c1c]">
      <HotelHeader />

      <div className="mx-auto flex max-w-[1180px] flex-col lg:flex-row">
        <FilterSidebar
          selectedCategories={selectedCategories}
          selectedLocations={selectedLocations}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onCategoryToggle={(category) =>
            setSelectedCategories(
              (current) =>
                toggleFilterValue(current as HotelCategory[], category) as HotelCategory[],
            )
          }
          onLocationToggle={(location) =>
            setSelectedLocations(
              (current) =>
                toggleFilterValue(current as HotelLocation[], location) as HotelLocation[],
            )
          }
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
        />

        <main className="flex-1 px-6 py-8 lg:px-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-[24px] leading-tight text-[#1d1d1d] sm:text-[30px]">
                Available for rent in{' '}
                <span className="font-semibold">{locationLabel}</span>
              </h1>
              <p className="mt-3 text-sm text-[#515151]">
                {unitCount} {unitCount === 1 ? 'unit' : 'units'} available
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-[#202020]">
              <button
                type="button"
                onClick={() => router.push('/dashboard/guest/suggestions')}
                className="inline-flex items-center gap-2 rounded-lg border border-[#e7e2dc] bg-white px-3 py-2 font-medium transition hover:bg-[#fff9f0]"
              >
                <Lightbulb className="h-4 w-4 text-[#ff6a00]" /> Suggestions view
              </button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/apartments')}
                className="inline-flex items-center gap-2 rounded-lg border border-[#e7e2dc] bg-white px-3 py-2 font-medium transition hover:bg-[#fff9f0]"
              >
                <LayoutGrid className="h-4 w-4 text-[#ff6a00]" /> Switch to host view
              </button>
              <span className="ml-1 inline-flex items-center gap-2">
                <BsSortDownAlt className="h-4 w-4" />
                <span>Sort by:</span>
                <span className="font-semibold text-[#ff6a00]">Relevance</span>
              </span>
            </div>
          </div>

          <div className="mt-6">
            <BedroomTabs
              selected={selectedBedrooms}
              onSelect={setSelectedBedrooms}
            />
          </div>

          <div className="mt-8">
            <ApartmentGrid
              apartments={filteredApartments}
              onApartmentClick={handleApartmentClick}
              conversationApartmentId={(apartment) => canonicalApartmentRouteId(apartment.id) ?? undefined}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
