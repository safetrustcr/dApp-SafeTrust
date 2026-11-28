"use client";
// apps/frontend/src/components/booking/BookingEscrowWrapper.tsx
import type { CSSProperties } from 'react';
import Link from 'next/link';

type BookingEscrowWrapperProps = {
  bookingId: string;
};

const styles = {
  card: {
    border: '1px solid #fed7aa',
    borderRadius: '1rem',
    backgroundColor: '#ffffff',
    padding: '2rem',
    maxWidth: '36rem',
    margin: '0 auto',
    display: 'grid',
    gap: '1.25rem',
  } satisfies CSSProperties,
  heading: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#111827',
  } satisfies CSSProperties,
  meta: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#6b7280',
  } satisfies CSSProperties,
  badge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    backgroundColor: '#fff7ed',
    border: '1px solid #fed7aa',
    color: '#92400e',
    fontSize: '0.8rem',
    fontWeight: 600,
  } satisfies CSSProperties,
  notice: {
    padding: '1rem',
    borderRadius: '0.75rem',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    color: '#6b7280',
    fontSize: '0.875rem',
    lineHeight: 1.55,
  } satisfies CSSProperties,
} as const;

/**
 * BookingEscrowWrapper — entry point for a saved hotel reservation.
 *
 * Hotel bookings enter the same orchestrator as apartment bookings. The
 * server verifies the reservation, wallet, amount, and hotel receiver.
 */
export function BookingEscrowWrapper({ bookingId }: BookingEscrowWrapperProps) {
  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Secure your booking</h2>
      <p style={styles.meta}>
        Booking ID: <span style={styles.badge}>{bookingId}</span>
      </p>
      <p style={styles.notice}>Review the saved reservation, connect its registered Stellar wallet, and sign the hotel escrow deployment.</p>
      <Link href={`/escrow/${encodeURIComponent(bookingId)}/escrow/create?kind=hotel-room`} style={{ color: '#c2410c', fontWeight: 700 }}>
        Open secure booking details →
      </Link>
    </div>
  );
}
