'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import type { PropertyFilter } from '@safetrust/types';
import { ListingCard } from '@/components/rent/ListingCard';
import { useRentalProperties } from '@/hooks/use-rental-properties';
import { propertyToListing } from '@/lib/rent/property-listing';
import { routes } from '@/lib/routes';

function readPrice(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default function RentListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { properties, loading, error, hasMore, loadMore, refetch } =
    useRentalProperties('both');

  const location = searchParams.get('location') ?? '';
  const [locationInput, setLocationInput] = useState(location);
  const [minPriceInput, setMinPriceInput] = useState(searchParams.get('minPrice') ?? '');
  const [maxPriceInput, setMaxPriceInput] = useState(searchParams.get('maxPrice') ?? '');
  useEffect(() => setLocationInput(location), [location]);
  useEffect(() => {
    setMinPriceInput(searchParams.get('minPrice') ?? '');
    setMaxPriceInput(searchParams.get('maxPrice') ?? '');
  }, [searchParams]);

  const kindValue = searchParams.get('kind');
  const kind: PropertyFilter =
    kindValue === 'apartment' || kindValue === 'hotel' ? kindValue : 'both';
  const minPrice = readPrice(searchParams.get('minPrice'));
  const maxPrice = readPrice(searchParams.get('maxPrice'));
  const listings = useMemo(() => properties.map(propertyToListing), [properties]);
  const filteredListings = useMemo(() => {
    const normalizedLocation = location.trim().toLocaleLowerCase();
    return listings.filter((listing) => {
      if (kind !== 'both' && listing.kind !== kind) return false;
      const matchesLocation =
        !normalizedLocation ||
        `${listing.address} ${listing.location}`
          .toLocaleLowerCase()
          .includes(normalizedLocation);
      const matchesMin =
        minPrice === undefined ||
        (listing.priceAvailable !== false && listing.price >= minPrice);
      const matchesMax =
        maxPrice === undefined ||
        (listing.priceAvailable !== false && listing.price <= maxPrice);
      return matchesLocation && matchesMin && matchesMax;
    });
  }, [kind, listings, location, maxPrice, minPrice]);

  const updateFilters = (updates: Record<string, string>) => {
    const query = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) query.set(key, value);
      else query.delete(key);
    }
    router.push(routes.rent(query), { scroll: false });
  };
  const clearFilters = () => router.push(routes.rent(), { scroll: false });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link href={routes.home()} className="text-xl font-bold">SafeTrust</Link>
          <Link href={routes.suggestions()} className="text-sm font-semibold text-orange-700 hover:underline dark:text-orange-300">
            Suggestions
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="h-fit space-y-6 rounded-2xl border bg-card p-5">
          <div>
            <h2 className="mb-3 font-semibold">Stay type</h2>
            <select
              aria-label="Stay type"
              value={kind}
              onChange={(event) => updateFilters({ kind: event.target.value === 'both' ? '' : event.target.value })}
              className="w-full rounded-lg border bg-background px-3 py-2"
            >
              <option value="both">All stays</option>
              <option value="apartment">Apartments</option>
              <option value="hotel">Hotels</option>
            </select>
          </div>

          <div>
            <label htmlFor="rent-location" className="mb-3 block font-semibold">Location</label>
            <input
              id="rent-location"
              value={locationInput}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setLocationInput(event.target.value)}
              onBlur={() => updateFilters({ location: locationInput.trim() })}
              placeholder="City or neighborhood"
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="mb-3 font-semibold">Price range</legend>
            <label className="block text-sm text-muted-foreground" htmlFor="min-price">Minimum</label>
            <input
              id="min-price"
              type="number"
              min="0"
              value={minPriceInput}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setMinPriceInput(event.target.value)}
              onBlur={() => updateFilters({ minPrice: minPriceInput })}
              placeholder="No minimum"
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
            <label className="block text-sm text-muted-foreground" htmlFor="max-price">Maximum</label>
            <input
              id="max-price"
              type="number"
              min="0"
              value={maxPriceInput}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setMaxPriceInput(event.target.value)}
              onBlur={() => updateFilters({ maxPrice: maxPriceInput })}
              placeholder="No maximum"
              className="w-full rounded-lg border bg-background px-3 py-2"
            />
          </fieldset>
          <button type="button" onClick={clearFilters} className="text-sm font-semibold text-orange-700 underline dark:text-orange-300">
            Clear filters
          </button>
        </aside>

        <section className="min-w-0">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-300">Browse stays</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Find a place to stay</h1>
            <p className="mt-2 text-muted-foreground">
              {location ? `Showing stays matching “${location}”` : 'Explore available apartments and hotels.'}
            </p>
          </div>

          {loading && (
            <div role="status" aria-label="Loading stays" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="animate-pulse overflow-hidden rounded-2xl border">
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="space-y-3 p-4"><div className="h-5 w-1/2 rounded bg-muted" /><div className="h-4 w-2/3 rounded bg-muted" /></div>
                </div>
              ))}
            </div>
          )}
          {error && (
            <div role="alert" className="rounded-2xl border border-destructive/30 p-8 text-center">
              <p>We couldn&apos;t load stays. Try again.</p>
              <button type="button" onClick={refetch} className="mt-3 font-semibold text-orange-700 underline dark:text-orange-300">Try again</button>
            </div>
          )}
          {!loading && !error && filteredListings.length === 0 && (
            <div className="rounded-2xl border p-10 text-center">
              <p className="text-lg font-semibold">No stays match these filters</p>
              <button type="button" onClick={clearFilters} className="mt-3 font-semibold text-orange-700 underline dark:text-orange-300">Clear filters</button>
            </div>
          )}
          {!loading && !error && filteredListings.length > 0 && (
            <>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredListings.map((listing) => {
                  const property = properties.find(
                    (item) => item.id === listing.id && item.kind === listing.kind,
                  );
                  return property ? (
                    <ListingCard key={`${property.kind}:${property.id}`} property={property} />
                  ) : null;
                })}
              </div>
              {hasMore && (
                <button type="button" disabled={loading} onClick={loadMore} className="mt-8 rounded-xl border px-5 py-3 font-semibold hover:bg-muted">
                  Load more stays
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
