// apps/frontend/src/components/dashboard/apartments/InterestedPeopleTable.tsx
import type { CSSProperties } from 'react';

export type RentalOffer = {
  id: number;
  tenant_name: string;
  tenant_phone: string;
  tenant_wallet_address: string;
  offer_date: string;
  bid_status: 'pending' | 'accepted' | 'rejected' | string;
};

type InterestedPeopleTableProps = {
  offers: RentalOffer[];
  totalCount: number;
  isLoading?: boolean;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  accepted: { bg: '#dcfce7', color: '#166534' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
  pending:  { bg: '#fef9c3', color: '#854d0e' },
};

const styles = {
  wrap: {
    border: '1px solid #e5e7eb',
    borderRadius: '1rem',
    overflow: 'hidden',
  } satisfies CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  } satisfies CSSProperties,
  heading: {
    margin: 0,
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#111827',
  } satisfies CSSProperties,
  count: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#6b7280',
  } satisfies CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.875rem',
  } satisfies CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '0.75rem 1.25rem',
    color: '#6b7280',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  } satisfies CSSProperties,
  td: {
    padding: '0.875rem 1.25rem',
    borderBottom: '1px solid #f3f4f6',
    color: '#111827',
  } satisfies CSSProperties,
  empty: {
    padding: '2.5rem',
    textAlign: 'center' as const,
    color: '#9ca3af',
    fontSize: '0.875rem',
  } satisfies CSSProperties,
} as const;

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: '#f3f4f6', color: '#374151' };
  return (
    <span
      style={{
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.color,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function InterestedPeopleTable({
  offers,
  totalCount,
  isLoading = false,
}: InterestedPeopleTableProps) {
  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h3 style={styles.heading}>Interested tenants</h3>
        <p style={styles.count}>{totalCount} total</p>
      </div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Phone</th>
            <th style={styles.th}>Wallet</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td colSpan={5} style={styles.empty}>Loading…</td>
            </tr>
          )}
          {!isLoading && offers.length === 0 && (
            <tr>
              <td colSpan={5} style={styles.empty}>No interested tenants yet.</td>
            </tr>
          )}
          {!isLoading && offers.map((offer) => (
            <tr key={offer.id}>
              <td style={styles.td}>{offer.tenant_name}</td>
              <td style={styles.td}>{offer.tenant_phone}</td>
              <td style={styles.td}>
                <code style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                  {offer.tenant_wallet_address}
                </code>
              </td>
              <td style={styles.td}>{formatDate(offer.offer_date)}</td>
              <td style={styles.td}>
                <StatusBadge status={offer.bid_status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}