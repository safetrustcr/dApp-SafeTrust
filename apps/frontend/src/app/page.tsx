'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ListingCard } from '@/components/rent/ListingCard';
import { useListings } from '@/hooks/use-listings';
import { routes } from '@/lib/routes';

export default function HomePage() {
  const router = useRouter();
  const [location, setLocation] = useState('');
  const { properties, loading, error, refetch } = useListings({ limit: 6 });

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (location.trim()) query.set('location', location.trim());
    router.push(routes.rent(query));
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <Link href={routes.home()} className="text-xl font-bold tracking-tight">
            SafeTrust
          </Link>
          <nav aria-label="Main navigation" className="flex items-center gap-5 text-sm">
            <Link className="font-medium hover:text-orange-600" href={routes.rent()}>
              Find a stay
            </Link>
            <Link className="font-medium hover:text-orange-600" href={routes.login()}>
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-orange-50 dark:bg-orange-950/20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:py-24 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          <div>
            <p className="font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
              Stay with confidence
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Find a place. Make the agreement with trust.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Browse real rentals and keep your booking funds protected with
              transparent, on-chain escrow.
            </p>
            <form onSubmit={search} className="mt-8 flex max-w-xl flex-col gap-3 rounded-2xl border bg-background p-3 shadow-lg sm:flex-row">
              <label className="sr-only" htmlFor="home-location">City or neighborhood</label>
              <input
                id="home-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="City or neighborhood"
                className="min-w-0 flex-1 rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button className="rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700">
                Search stays
              </button>
            </form>
            <Link href={routes.rent()} className="mt-5 inline-block text-sm font-semibold text-orange-700 underline-offset-4 hover:underline dark:text-orange-300">
              Explore all stays
            </Link>
          </div>
          <div className="hidden min-h-72 rounded-[2rem] bg-gradient-to-br from-orange-200 via-amber-100 to-emerald-100 shadow-inner dark:from-orange-950 dark:via-amber-950 dark:to-emerald-950 lg:block" aria-hidden="true" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 md:py-20">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-300">Discover</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Featured stays</h2>
          </div>
          <Link href={routes.rent()} className="text-sm font-semibold text-orange-700 hover:underline dark:text-orange-300">
            View all stays
          </Link>
        </div>

        {loading && (
          <div role="status" aria-label="Loading featured stays" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="animate-pulse overflow-hidden rounded-2xl border">
                <div className="aspect-[4/3] bg-muted" />
                <div className="space-y-3 p-4"><div className="h-5 w-1/3 rounded bg-muted" /><div className="h-4 w-2/3 rounded bg-muted" /></div>
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
        {!loading && !error && properties.length === 0 && (
          <p className="rounded-2xl border p-8 text-center text-muted-foreground">No stays are available right now.</p>
        )}
        {!loading && !error && properties.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => <ListingCard key={`${property.kind}:${property.id}`} property={property} />)}
          </div>
        )}
      </section>
    </main>
  );
}
