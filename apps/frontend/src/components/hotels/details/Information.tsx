// apps/frontend/src/components/hotels/details/Information.tsx
import type { CSSProperties } from 'react';
import { MapPin } from 'lucide-react';

type InformationProps = {
  name: string;
  location: string;
  price: string;
};

const styles = {
  wrap: { display: 'grid', gap: '0.5rem' } satisfies CSSProperties,
  name: { margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827' } satisfies CSSProperties,
  row: { display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280', fontSize: '0.875rem' } satisfies CSSProperties,
  price: { margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f97316' } satisfies CSSProperties,
} as const;

export default function Information({ name, location, price }: InformationProps) {
  return (
    <div style={styles.wrap}>
      <h1 style={styles.name}>{name}</h1>
      <div style={styles.row}>
        <MapPin size={14} color="#f97316" strokeWidth={2} />
        {location}
      </div>
      <p style={styles.price}>{price} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280' }}>/ night</span></p>
    </div>
  );
}