// apps/frontend/src/components/escrow/EscrowOverviewCard.tsx
import type { CSSProperties } from 'react';

type EscrowOverviewCardProps = {
  title?: string;
  count?: number;
  totalAmount?: number;
  status?: string;
};

const styles = {
  card: {
    border: '1px solid #fed7aa', borderRadius: '1rem',
    backgroundColor: '#ffffff', padding: '1.25rem',
    display: 'grid', gap: '0.5rem',
  } satisfies CSSProperties,
  label: { margin: 0, fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 } satisfies CSSProperties,
  count: { margin: 0, fontSize: '2rem', fontWeight: 800, color: '#111827', lineHeight: 1 } satisfies CSSProperties,
  amount: { margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f97316' } satisfies CSSProperties,
} as const;

export function EscrowOverviewCard({
  title = 'Escrows',
  count = 0,
  totalAmount,
  status,
}: EscrowOverviewCardProps) {
  return (
    <div style={styles.card}>
      <p style={styles.label}>{title}{status ? ` · ${status}` : ''}</p>
      <p style={styles.count}>{count}</p>
      {totalAmount !== undefined && (
        <p style={styles.amount}>${totalAmount.toLocaleString('en-US')} USDC total</p>
      )}
    </div>
  );
}