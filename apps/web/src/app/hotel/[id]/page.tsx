// TODO: replace with real detail components once merged in frontend-SafeTrust
// Sources:
//   frontend-SafeTrust/src/components/hotel/ApartmentDetail.tsx
//   frontend-SafeTrust/src/components/hotel/ImageGallery.tsx
//   frontend-SafeTrust/src/components/hotel/SuggestionsList.tsx
//   frontend-SafeTrust/src/components/hotel/AmenityIcons.tsx
//
// Data source (when wired):
//   Apollo query: GET_APARTMENT_BY_ID -> public.apartments (Hasura)

import Link from 'next/link';
import type { CSSProperties } from 'react';

const STUB_APARTMENT = {
  name: 'La sabana sur',
  address: '329 Calle santos, paseo colón, San José',
  price: 4058,
  bedrooms: 2,
  bathrooms: 1,
  petFriendly: true,
  owner: {
    name: 'Alberto Casas',
    email: 'owner@example.com',
    phone: '+1 555-0100',
  },
  description:
    'Beautiful apartment in the heart of San José with modern amenities and stunning views.',
};

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#fff7ed',
    color: '#111827',
  } satisfies CSSProperties,
  aside: {
    width: '18rem',
    borderRight: '1px solid #fed7aa',
    padding: '1rem',
    flexShrink: 0,
    display: 'none',
  } satisfies CSSProperties,
  suggestionCard: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.5rem',
    marginBottom: '0.5rem',
    border: '1px solid #fdba74',
    borderRadius: '0.75rem',
    backgroundColor: '#ffffff',
    fontSize: '0.75rem',
  } satisfies CSSProperties,
  imagePlaceholder: {
    backgroundColor: '#fed7aa',
    borderRadius: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9a3412',
  } satisfies CSSProperties,
  main: {
    flex: 1,
    maxWidth: '64rem',
    padding: '1.5rem',
  } satisfies CSSProperties,
  gallery: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  } satisfies CSSProperties,
  thumbs: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  } satisfies CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '1rem',
  } satisfies CSSProperties,
  button: {
    display: 'inline-block',
    backgroundColor: '#f97316',
    color: '#ffffff',
    fontWeight: 700,
    padding: '0.75rem 1.5rem',
    borderRadius: '0.75rem',
  } satisfies CSSProperties,
  metaRow: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  } satisfies CSSProperties,
} as const;

export default function ApartmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div style={styles.page}>
      {/* TODO: replace with <SuggestionsList /> */}
      <aside style={styles.aside} className="desktop-suggestions">
        <p style={{ marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 600 }}>
          Suggestions
        </p>
        <p style={{ marginBottom: '1rem', fontSize: '0.75rem', color: '#78716c' }}>
          More than 200 available
        </p>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={styles.suggestionCard}>
            <div
              style={{
                width: '3rem',
                height: '3rem',
                flexShrink: 0,
                borderRadius: '0.75rem',
                backgroundColor: '#fed7aa',
              }}
            />
            <div>
              <p style={{ margin: 0, fontWeight: 500 }}>Los yoses</p>
              <p style={{ margin: '0.25rem 0', color: '#78716c' }}>
                329 Calle santos, San José
              </p>
              <p style={{ margin: 0, color: '#ea580c', fontWeight: 600 }}>$4.000</p>
            </div>
          </div>
        ))}
      </aside>

      <main style={styles.main}>
        {/* TODO: replace with <ImageGallery images={apartment.images} /> */}
        <div style={styles.gallery}>
          <div style={{ ...styles.imagePlaceholder, minHeight: '16rem' }}>
            <span style={{ fontSize: '0.75rem' }}>Main image</span>
          </div>
          <div style={styles.thumbs}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ ...styles.imagePlaceholder, flex: 1, minHeight: '5rem' }}>
                <span style={{ fontSize: '0.75rem' }}>Thumb {i}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.header}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>{STUB_APARTMENT.name}</h1>
            <p style={{ marginTop: '0.5rem', color: '#ea580c', fontWeight: 600 }}>
              ${STUB_APARTMENT.price.toLocaleString()}.00 Per month
            </p>
          </div>

          <Link href={`/hotel/${params.id}/escrow/create`} style={styles.button}>
            BOOK
          </Link>
        </div>

        {/* TODO: replace with <AmenityIcons /> */}
        <div style={{ ...styles.metaRow, color: '#57534e', fontSize: '0.95rem' }}>
          <span>📍 {STUB_APARTMENT.address}</span>
        </div>
        <div style={{ ...styles.metaRow, fontSize: '0.95rem' }}>
          <span>🛏 {STUB_APARTMENT.bedrooms} bd</span>
          <span>🐾 {STUB_APARTMENT.petFriendly ? 'pet friendly' : 'no pets'}</span>
          <span>🚿 {STUB_APARTMENT.bathrooms} ba</span>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <p style={{ marginBottom: '0.25rem', fontWeight: 600 }}>
            Owner: {STUB_APARTMENT.owner.name}
          </p>
        </div>

        <div>
          <h2 style={{ marginBottom: '0.25rem', fontWeight: 600 }}>Apartment details</h2>
          <p style={{ color: '#57534e', lineHeight: 1.6 }}>{STUB_APARTMENT.description}</p>
        </div>
      </main>
    </div>
  );
}
