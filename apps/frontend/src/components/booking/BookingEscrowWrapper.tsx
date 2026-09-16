"use client";
// apps/frontend/src/components/booking/BookingEscrowWrapper.tsx
import type { CSSProperties } from 'react';

type BookingEscrowWrapperProps = {
  bookingId: string;
  onComplete?: () => void;
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
  button: {
    border: '1px solid #f97316',
    backgroundColor: '#f97316',
    color: '#ffffff',
    fontWeight: 700,
    padding: '0.65rem 1.5rem',
    borderRadius: '0.75rem',
    cursor: 'pointer',
    fontSize: '0.95rem',
    width: '100%',
  } satisfies CSSProperties,
} as const;

/**
 * BookingEscrowWrapper — MVP stub.
 *
 * Full implementation tracks hotel booking escrow via TrustlessWork.
 * Wired to apps/api POST /api/escrow/deploy once hotel_industry
 * escrow routes are ported from apps/frontend (issue #308).
 *
 * For now renders booking context and a placeholder CTA so hotel
 * escrow pages compile and render without crashing.
 */
export function BookingEscrowWrapper({
  bookingId,
  onComplete,
}: BookingEscrowWrapperProps) {
  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Secure your booking</h2>
      <p style={styles.meta}>
        Booking ID: <span style={styles.badge}>{bookingId}</span>
      </p>
      <p style={styles.notice}>
        Hotel escrow payments use the TrustlessWork single-release contract on
        Stellar. Your deposit is locked until check-out is confirmed by both
        parties. Full escrow flow coming in issue #308.
      </p>
      {onComplete && (
        <button type="button" style={styles.button} onClick={onComplete}>
          Continue
        </button>
      )}
    </div>
  );
}