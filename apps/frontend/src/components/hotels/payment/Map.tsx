"use client";
// apps/frontend/src/components/hotels/payment/Map.tsx
// MVP stub — full Leaflet/MapLibre map wired to coordinates in Phase 2.
import type { CSSProperties } from 'react';
import { MapPin } from 'lucide-react';

type HotelMapProps = {
  coordinates: [number, number];
  hotelName: string;
};

const styles = {
  wrap: {
    border: '1px solid #e5e7eb', borderRadius: '1rem', overflow: 'hidden',
    backgroundColor: '#f9fafb', minHeight: '250px',
    display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
  } satisfies CSSProperties,
  icon: { color: '#f97316' } satisfies CSSProperties,
  name: { margin: 0, fontWeight: 600, color: '#111827', fontSize: '0.9rem' } satisfies CSSProperties,
  coords: { margin: 0, color: '#9ca3af', fontSize: '0.75rem', fontFamily: 'monospace' } satisfies CSSProperties,
  note: { margin: 0, color: '#d1d5db', fontSize: '0.7rem' } satisfies CSSProperties,
} as const;

export default function HotelMap({ coordinates, hotelName }: HotelMapProps) {
  return (
    <div style={styles.wrap}>
      <MapPin size={28} style={styles.icon} />
      <p style={styles.name}>{hotelName}</p>
      <p style={styles.coords}>{coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}</p>
      <p style={styles.note}>Map view — Phase 2</p>
    </div>
  );
}