'use client';

import type { HotelCategory, HotelListing, HotelLocation } from '@/@types/hotel';
import {
  ApartmentGrid,
  FilterSidebar,
  HotelHeader,
} from '@/components/rent';
import type { PropertyFilter, PublicRentalProperty } from '@safetrust/types';
import { useRentalProperties } from '@/hooks/use-rental-properties';
import { propertyToListing } from '@/lib/rent/property-listing';
import { HotelListingDialog } from '@/components/rent/HotelListingDialog';
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
  const [propertyKind, setPropertyKind] = useState<PropertyFilter>('both');
  const [selectedHotel, setSelectedHotel] = useState<PublicRentalProperty | null>(null);
  const { properties, loading, error, hasMore, loadMore, refetch } = useRentalProperties(propertyKind);
  const listings = useMemo(() => properties.map(propertyToListing), [properties]);
  const [selectedCategories, setSelectedCategories] = useState<HotelCategory[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<HotelLocation[]>([]);
  const selectedBedrooms = 'all';
  const [sortOption, setSortOption] = useState<SortOption>('relevance');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(206000);

  const filteredApartments = useMemo(
    () =>
      filterRentListings(listings, {
        selectedCategories,
        selectedLocations,
        selectedBedrooms,
        sortOption,
        minPrice,
        maxPrice,
      }),
    [
      listings,
      maxPrice,
      minPrice,
      selectedBedrooms,
      selectedCategories,
      selectedLocations,
      sortOption,
    ],
  );

  const handleApartmentClick = (apartment: HotelListing) => {
    if (apartment.kind === 'hotel') {
      setSelectedHotel(properties.find((property) => property.kind === 'hotel' && property.id === apartment.id) ?? null);
      return;
    }
    router.push(`/escrow/${apartment.id}/escrow/create`);
  };

  const locationLabel =
    selectedLocations.length > 0
      ? `Costa Rica, ${selectedLocations.join(', ')}`
      : 'Costa Rica';
  const unitCount = filteredApartments.length;

  return (
    <div className="min-h-screen bg-white text-[#1c1c1c]">
      <HotelHeader />
      <HotelListingDialog hotel={selectedHotel} onClose={() => setSelectedHotel(null)} />

      <div className="mx-auto flex max-w-[1180px] flex-col lg:flex-row">
        <FilterSidebar
          showCategories={false}
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
                <select aria-label="Sort properties" value={sortOption} onChange={(event) => setSortOption(event.target.value as SortOption)} className="bg-white font-semibold text-[#ff6a00]"><option value="relevance">Relevance</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select>
              </span>
            </div>
          </div>

          <div className="mt-6">
            <div aria-label="Property type" className="flex flex-wrap gap-3">{([{ value: 'both', label: 'Both' }, { value: 'apartment', label: 'Apartments' }, { value: 'hotel', label: 'Hotels' }] as const).map(({ value, label }) => <button key={value} type="button" aria-pressed={propertyKind === value} onClick={() => setPropertyKind(value)} className={`rounded-lg border px-5 py-3 text-sm ${propertyKind === value ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white'}`}>{label}</button>)}</div>
          </div>

          <div className="mt-8">
            {loading && <p role="status" className="mb-4 text-sm text-gray-500">Loading registered properties…</p>}
            {error && <div role="alert" className="mb-4 rounded-lg border border-orange-200 p-4 text-sm">{error} <button type="button" onClick={refetch} className="ml-2 font-semibold text-orange-600">Retry</button></div>}
            {!loading && !error && !filteredApartments.length && <p className="text-sm text-gray-500">No registered properties match these filters.</p>}
            <ApartmentGrid
              apartments={filteredApartments}
              onApartmentClick={handleApartmentClick}
              conversationApartmentId={(apartment) => apartment.kind === "apartment" ? apartment.id : undefined}
            />
            {hasMore && !error && <button type="button" disabled={loading} onClick={loadMore} className="mt-6 rounded-lg border px-5 py-3 text-sm">Load more properties</button>}
          </div>
        </main>
      </div>
    </div>
  );
}
