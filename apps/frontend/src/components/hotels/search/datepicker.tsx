"use client";
// apps/frontend/src/components/hotels/search/datepicker.tsx
// MVP stub — full date range picker for hotel search in Phase 2.
import type { CSSProperties } from 'react';

type DatePickerProps = {
  value?: { from?: Date; to?: Date };
  onChange?: (range: { from?: Date; to?: Date }) => void;
  placeholder?: string;
};

const styles = {
  wrap: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    border: '1px solid #e5e7eb', borderRadius: '0.75rem',
    padding: '0.6rem 1rem', backgroundColor: '#ffffff',
    fontSize: '0.875rem', color: '#6b7280', cursor: 'pointer',
  } satisfies CSSProperties,
} as const;

function fmt(d?: Date) {
  if (!d) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DatePicker({ value, placeholder = 'Select dates' }: DatePickerProps) {
  const label = value?.from
    ? `${fmt(value.from)}${value.to ? ` – ${fmt(value.to)}` : ''}`
    : placeholder;
  return <div style={styles.wrap}>{label}</div>;
}

// Default export for pages that do: import DatePicker from '...'
export default DatePicker;