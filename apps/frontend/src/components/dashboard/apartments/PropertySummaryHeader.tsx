// apps/frontend/src/components/dashboard/apartments/PropertySummaryHeader.tsx
import type { CSSProperties } from 'react';
import { MapPin, BedDouble, Bath } from 'lucide-react';

type PropertySummaryHeaderProps = {
  name: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  price: number;
};

const styles = {
  card: {
    border: '1px solid #fed7aa',
    borderRadius: '1rem',
    backgroundColor: '#ffffff',
    padding: '1.25rem 1.5rem',
    display: 'grid',
    gap: '0.75rem',
  } satisfies CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  } satisfies CSSProperties,
  name: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: 700,
    color: '#111827',
  } satisfies CSSProperties,
  price: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: 800,
    color: '#f97316',
    whiteSpace: 'nowrap' as const,
  } satisfies CSSProperties,
  meta: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '1rem',
    alignItems: 'center',
  } satisfies CSSProperties,
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    color: '#6b7280',
    fontSize: '0.875rem',
  } satisfies CSSProperties,
} as const;

export function PropertySummaryHeader({
  name,
  address,
  bedrooms,
  bathrooms,
  price,
}: PropertySummaryHeaderProps) {
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h2 style={styles.name}>{name}</h2>
        <p style={styles.price}>
          ${price.toLocaleString('en-US')}{' '}
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#92400e' }}>/ mo</span>
        </p>
      </div>
      <div style={styles.meta}>
        <span style={styles.metaItem}>
          <MapPin size={14} color="#f97316" strokeWidth={2} />
          {address}
        </span>
        <span style={styles.metaItem}>
          <BedDouble size={14} color="#9ca3af" strokeWidth={2} />
          {bedrooms} bd
        </span>
        <span style={styles.metaItem}>
          <Bath size={14} color="#9ca3af" strokeWidth={2} />
          {bathrooms} ba
        </span>
      </div>
    </div>
  );
}