// apps/frontend/src/components/dashboard/guest/GuestBookingsSummary.tsx
import type { CSSProperties } from 'react';

type Booking = {
  id: string;
  propertyName: string;
  status: string;
  amount?: number;
  date?: string;
};

type GuestBookingsSummaryProps = {
  bookings?: Booking[];
  isLoading?: boolean;
};

const styles = {
  wrap: { display: 'grid', gap: '0.75rem' } satisfies CSSProperties,
  heading: { margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#111827' } satisfies CSSProperties,
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0.75rem 1rem', borderRadius: '0.75rem',
    border: '1px solid #f3f4f6', backgroundColor: '#fafafa',
    gap: '0.75rem', flexWrap: 'wrap' as const,
  } satisfies CSSProperties,
  name: { margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#111827' } satisfies CSSProperties,
  meta: { margin: 0, fontSize: '0.75rem', color: '#6b7280' } satisfies CSSProperties,
  badge: {
    padding: '0.2rem 0.6rem', borderRadius: '9999px',
    fontSize: '0.7rem', fontWeight: 600,
    backgroundColor: '#fff7ed', color: '#92400e',
  } satisfies CSSProperties,
  empty: { margin: 0, color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center' as const, padding: '1.5rem 0' } satisfies CSSProperties,
} as const;

export function GuestBookingsSummary({ bookings = [], isLoading = false }: GuestBookingsSummaryProps) {
  return (
    <div style={styles.wrap}>
      <h3 style={styles.heading}>My bookings</h3>
      {isLoading && <p style={styles.empty}>Loading…</p>}
      {!isLoading && bookings.length === 0 && (
        <p style={styles.empty}>No bookings yet.</p>
      )}
      {!isLoading && bookings.map((b) => (
        <div key={b.id} style={styles.row}>
          <div>
            <p style={styles.name}>{b.propertyName}</p>
            {b.date && <p style={styles.meta}>{b.date}</p>}
          </div>
          <span style={styles.badge}>{b.status}</span>
        </div>
      ))}
    </div>
  );
}
export default GuestBookingsSummary;
