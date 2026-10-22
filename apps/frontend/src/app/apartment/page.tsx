// Apartment listing page — renders real records from the typed model.
//
// Data: useListings({ kind: 'apartment' }) → GET_ALL_APARTMENTS →
// features/listings (see docs/frontend-migration/listing-fields.md).
// Loading, empty and error (unauthorized vs network) are distinct states and
// a failed request never falls back to fixtures. Fields the API doesn't have
// (bedrooms, bathrooms, pets…) stay hidden — never invented. Presentation
// components (FilterSidebar, BedroomTabs, ApartmentGrid) land with the next
// issue; the bedroom tabs are absent because there is no bedroom data.

"use client";

import Link from 'next/link';
import type { CSSProperties } from 'react';

import { useListings } from '@/features/listings/use-listings';

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#fffaf5',
    color: '#111827',
  } satisfies CSSProperties,
  sidebar: {
    width: '14rem',
    borderRight: '1px solid #fed7aa',
    padding: '1rem',
    display: 'none',
    flexShrink: 0,
    backgroundColor: '#ffffff',
  } satisfies CSSProperties,
  main: {
    flex: 1,
    padding: '1.5rem',
  } satisfies CSSProperties,
  subtitle: {
    margin: '0 0 1.5rem',
    fontSize: '0.95rem',
    color: '#78716c',
  } satisfies CSSProperties,
  stateText: {
    margin: '0 0 1rem',
    fontSize: '0.95rem',
    color: '#57534e',
    lineHeight: 1.6,
  } satisfies CSSProperties,
  errorText: {
    margin: '0 0 1rem',
    fontSize: '0.95rem',
    color: '#b91c1c',
    lineHeight: 1.6,
  } satisfies CSSProperties,
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '1rem',
  } satisfies CSSProperties,
  card: {
    display: 'block',
    border: '1px solid #fed7aa',
    borderRadius: '1rem',
    padding: '1rem',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
  } satisfies CSSProperties,
  cardImage: {
    display: 'block',
    width: '100%',
    height: '8rem',
    objectFit: 'cover',
    marginBottom: '0.75rem',
    borderRadius: '0.75rem',
  } satisfies CSSProperties,
  imagePlaceholder: {
    height: '8rem',
    marginBottom: '0.75rem',
    borderRadius: '0.75rem',
    backgroundColor: '#ffedd5',
    color: '#9a3412',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
  } satisfies CSSProperties,
} as const;

const PRICE_UNIT_SUFFIX = { month: '/mo', night: '/night' } as const;

export default function ApartmentListingPage() {
  const { status, error, items } = useListings({ kind: 'apartment' });

  return (
    <div style={styles.page}>
      {/* TODO: replace with <FilterSidebar /> — filters stay disabled until
          their fields (amenities, capacity, availability) exist upstream. */}
      <aside style={styles.sidebar} className="hotel-filters">
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>Filters</p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#78716c' }}>
          Coming soon
        </p>
      </aside>

      <main style={styles.main}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
          Available for rent in Costa Rica, San José
        </h1>

        <p style={styles.subtitle}>
          {status === 'ready' && `${items.length} units available`}
          {status === 'loading' && 'Loading listings…'}
          {status === 'empty' && '0 units available'}
          {status === 'error' && 'Listings unavailable'}
        </p>

        {status === 'error' && (
          <p style={styles.errorText}>
            {error === 'unauthorized'
              ? 'You don’t have permission to view these listings.'
              : 'Couldn’t load listings. Check your connection and try again.'}
          </p>
        )}

        {status === 'empty' && (
          <p style={styles.stateText}>No apartments available right now.</p>
        )}

        {/* TODO: replace with <ApartmentGrid listings={items} /> */}
        {status === 'ready' && (
          <div style={styles.grid} className="hotel-grid">
            {items.map((listing) => (
              <Link key={listing.id} href={`/apartment/${listing.id}`} style={styles.card}>
                {listing.images[0] ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    style={styles.cardImage}
                  />
                ) : (
                  <div style={styles.imagePlaceholder}>No photos</div>
                )}
                <p style={{ margin: 0, color: '#ea580c', fontWeight: 700 }}>
                  ${listing.price.amount.toLocaleString()}
                  {PRICE_UNIT_SUFFIX[listing.price.unit]}
                </p>
                <p style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>{listing.title}</p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#78716c' }}>
                  {listing.addressLine}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
