// TODO: replace with real apartment listing components once merged in frontend-SafeTrust
// Sources:
//   frontend-SafeTrust/src/components/hotel/ApartmentGrid.tsx
//   frontend-SafeTrust/src/components/hotel/ApartmentCard.tsx
//   frontend-SafeTrust/src/components/hotel/FilterSidebar.tsx
//   frontend-SafeTrust/src/components/hotel/BedroomTabs.tsx
//
// Data source (when wired):
//   Apollo query: GET_APARTMENTS -> public.apartments (Hasura)

import Link from 'next/link';
import type { CSSProperties } from 'react';

const STUB_APARTMENTS = [
  {
    id: '1',
    name: 'La sabana sur',
    address: '329 Calle santos, San Jose',
    price: 4058,
    bedrooms: 2,
    bathrooms: 1,
    petFriendly: true,
  },
  {
    id: '2',
    name: 'Los yoses',
    address: '329 Calle santos, San Jose',
    price: 4000,
    bedrooms: 2,
    bathrooms: 1,
    petFriendly: true,
  },
  {
    id: '3',
    name: 'Escazú plaza',
    address: '45 Avenida central, Escazú',
    price: 3500,
    bedrooms: 1,
    bathrooms: 1,
    petFriendly: false,
  },
] as const;

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
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  } satisfies CSSProperties,
  tabButton: {
    padding: '0.45rem 0.9rem',
    border: '1px solid #fdba74',
    borderRadius: '999px',
    backgroundColor: '#ffffff',
    color: '#9a3412',
    fontSize: '0.875rem',
    cursor: 'pointer',
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
  imagePlaceholder: {
    height: '8rem',
    marginBottom: '0.75rem',
    borderRadius: '0.75rem',
    backgroundColor: '#ffedd5',
    color: '#9a3412',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
  } satisfies CSSProperties,
} as const;

export default function HotelListingPage() {
  return (
    <div style={styles.page}>
      {/* TODO: replace with <FilterSidebar /> */}
      <aside style={styles.sidebar} className="hotel-filters">
        <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700 }}>Filters</p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#78716c' }}>Coming soon</p>
      </aside>

      <main style={styles.main}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
          Available for rent in Costa Rica, San José
        </h1>
        <p style={{ margin: '0.5rem 0 1.5rem', fontSize: '0.95rem', color: '#78716c' }}>
          {STUB_APARTMENTS.length} units available (stub)
        </p>

        {/* TODO: replace with <BedroomTabs /> */}
        <div style={styles.tabs}>
          {['All apartments', '1 bedroom', '2 bedrooms', '3 bedrooms'].map((tab) => (
            <button key={tab} type="button" style={styles.tabButton}>
              {tab}
            </button>
          ))}
        </div>

        {/* TODO: replace with <ApartmentGrid apartments={data} /> */}
        <div style={styles.grid} className="hotel-grid">
          {STUB_APARTMENTS.map((apartment) => (
            <Link key={apartment.id} href={`/hotel/${apartment.id}`} style={styles.card}>
              <div style={styles.imagePlaceholder}>Image placeholder</div>
              <p style={{ margin: 0, color: '#ea580c', fontWeight: 700 }}>
                ${apartment.price.toLocaleString()}/mo
              </p>
              <p style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>{apartment.name}</p>
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: '#78716c' }}>
                {apartment.address}
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#78716c' }}>
                {apartment.bedrooms}bd | {apartment.petFriendly ? 'pet friendly' : 'no pets'} |{' '}
                {apartment.bathrooms}ba
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
