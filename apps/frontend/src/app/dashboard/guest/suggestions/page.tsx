'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Image } from '@/components/ui/image';
import { useAuthUser } from '@/components/auth/hooks/auth.hook';
import { useListings } from '@/hooks/use-listings';
import { routes } from '@/lib/routes';

export default function SuggestionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { properties, loading, error, refetch } = useListings({
    limit: 24,
    kind: 'apartment',
  });
  const { user, loading: authLoading } = useAuthUser();
  const selectedId = searchParams.get('selected');
  const selected = useMemo(
    () => properties.find((property) => property.id === selectedId) ?? properties[0],
    [properties, selectedId],
  );

  useEffect(() => {
    if (loading || error || !selected || selected.id === selectedId) return;
    const query = new URLSearchParams(searchParams.toString());
    query.set('selected', selected.id);
    router.replace(routes.suggestions(query), { scroll: false });
  }, [error, loading, router, searchParams, selected, selectedId]);

  const selectListing = (id: string) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set('selected', id);
    router.push(routes.suggestions(query), { scroll: false });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link href={routes.home()} className="text-xl font-bold">SafeTrust</Link>
          <Link href={routes.rent()} className="text-sm font-semibold text-orange-700 hover:underline dark:text-orange-300">
            Browse all stays
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[minmax(18rem,.8fr)_minmax(0,1.2fr)]">
        <section aria-label="Suggested stays" className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Suggestions</h1>
          <p className="mt-2 text-muted-foreground">Explore available apartments selected from current listings.</p>

          {loading && (
            <div role="status" aria-label="Loading suggestions" className="mt-6 space-y-3">
              {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border bg-muted" />)}
            </div>
          )}
          {error && (
            <div role="alert" className="mt-6 rounded-2xl border border-destructive/30 p-6">
              <p>We couldn&apos;t load stays. Try again.</p>
              <button type="button" onClick={refetch} className="mt-3 font-semibold text-orange-700 underline dark:text-orange-300">Try again</button>
            </div>
          )}
          {!loading && !error && properties.length === 0 && (
            <p className="mt-6 rounded-2xl border p-8 text-center text-muted-foreground">No stays are available right now.</p>
          )}
          {!loading && !error && properties.length > 0 && (
            <ul className="mt-6 space-y-3">
              {properties.map((property) => (
                <li key={property.id}>
                  <button
                    type="button"
                    aria-pressed={selected?.id === property.id}
                    onClick={() => selectListing(property.id)}
                    className={`flex w-full min-w-0 items-center gap-4 rounded-xl border p-3 text-left transition hover:border-orange-400 ${selected?.id === property.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' : 'bg-card'}`}
                  >
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {property.images[0] ? <Image src={property.images[0]} alt="" fill sizes="96px" className="object-cover" /> : null}
                    </div>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{property.name}</span>
                      <span className="mt-1 block truncate text-sm text-muted-foreground">
                        {[property.address, property.city].filter(Boolean).join(', ') || 'Location not provided'}
                      </span>
                      <span className="mt-2 block text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        {property.price === null ? 'Rate unavailable' : `$${property.price.toLocaleString()} per month`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {!loading && !error && selected && (
          <article className="min-w-0 overflow-hidden rounded-2xl border bg-card">
            <div className="relative aspect-[16/9] bg-muted">
              {selected.images[0] ? <Image src={selected.images[0]} alt={selected.name} fill sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" /> : null}
            </div>
            <div className="space-y-5 p-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-300">Apartment</p>
                <h2 className="mt-2 text-2xl font-bold">{selected.name}</h2>
                <p className="mt-2 text-muted-foreground">{[selected.address, selected.city].filter(Boolean).join(', ') || 'Location not provided'}</p>
              </div>
              <p className="text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
                {selected.price === null ? 'Rate unavailable' : `$${selected.price.toLocaleString()} per month`}
              </p>
              {selected.description && <p className="leading-7 text-muted-foreground">{selected.description}</p>}
              <div className="flex flex-wrap gap-3">
                <Link href={routes.listing({ kind: 'apartment', id: selected.id })} className="rounded-xl border px-5 py-3 text-center font-semibold hover:bg-muted">
                  View listing
                </Link>
                {selected.price !== null && (
                  <Link
                    href={authLoading || user ? routes.bookApartment(selected.id) : routes.login(routes.bookApartment(selected.id))}
                    className="rounded-xl bg-orange-600 px-5 py-3 text-center font-semibold text-white hover:bg-orange-700"
                  >
                    Book
                  </Link>
                )}
              </div>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
