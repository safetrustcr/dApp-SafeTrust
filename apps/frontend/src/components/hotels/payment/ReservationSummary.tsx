"use client";
// apps/frontend/src/components/hotels/payment/ReservationSummary.tsx
import type { CSSProperties } from 'react';

type ReservationSummaryProps = {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  nights?: number;
  hotelName?: string;
  description?: string;
  price?: number;
  tax?: number;
};

const styles = {
  card: {
    border: '1px solid #fed7aa', borderRadius: '1rem',
    backgroundColor: '#ffffff', padding: '1.25rem',
    display: 'grid', gap: '0.75rem',
  } satisfies CSSProperties,
  heading: { margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#111827' } satisfies CSSProperties,
  row: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', fontSize: '0.875rem',
  } satisfies CSSProperties,
  label: { margin: 0, color: '#6b7280' } satisfies CSSProperties,
  value: { margin: 0, fontWeight: 600, color: '#111827' } satisfies CSSProperties,
  divider: { border: 'none', borderTop: '1px solid #fed7aa', margin: 0 } satisfies CSSProperties,
  total: { margin: 0, fontWeight: 800, color: '#f97316', fontSize: '1rem' } satisfies CSSProperties,
} as const;

function fmt(val?: number) { return val !== undefined ? `$${val.toLocaleString('en-US')}` : '—'; }

export default function ReservationSummary({ checkIn, checkOut, guests, nights, price, tax }: ReservationSummaryProps) {
  const total = price !== undefined && tax !== undefined ? price + tax : undefined;

  return (
    <div style={styles.card}>
      <h3 style={styles.heading}>Reservation summary</h3>
      <div style={styles.row}><p style={styles.label}>Check-in</p><p style={styles.value}>{checkIn ?? '—'}</p></div>
      <div style={styles.row}><p style={styles.label}>Check-out</p><p style={styles.value}>{checkOut ?? '—'}</p></div>
      <div style={styles.row}><p style={styles.label}>Guests</p><p style={styles.value}>{guests ?? '—'}</p></div>
      <div style={styles.row}><p style={styles.label}>Nights</p><p style={styles.value}>{nights ?? '—'}</p></div>
      <div style={styles.row}><p style={styles.label}>Price / night</p><p style={styles.value}>{fmt(price)}</p></div>
      <hr style={styles.divider} />
      <div style={styles.row}><p style={styles.label}>Total</p><p style={styles.total}>{fmt(total)}</p></div>
    </div>
  );
}
