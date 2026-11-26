import { useEffect, type CSSProperties } from 'react';
import { Check, X } from 'lucide-react';
import type { BidStatus } from '@/lib/api/bids';

export type RentalOffer = {
  id: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_wallet_address: string;
  proposed_price?: number;
  desired_move_in?: string;
  offer_date: string;
  bid_status: BidStatus | string;
};

export type OfferStatusFilter = 'ALL' | BidStatus;

type InterestedPeopleTableProps = {
  offers: RentalOffer[];
  totalCount: number;
  isLoading?: boolean;
  statusFilter?: OfferStatusFilter;
  onStatusFilterChange?: (status: OfferStatusFilter) => void;
  page?: number;
  pageSize?: number;
  onPageChange?: (nextPage: number) => void;
  onAccept?: (offerId: string) => void;
  onReject?: (offerId: string) => void;
  actingOfferId?: string | null;
};

const FILTER_OPTIONS: Array<{ value: OfferStatusFilter; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'VIEWED', label: 'Viewed' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'ESCROW_FUNDED', label: 'Escrow Funded' },
  { value: 'ESCROW_COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  PENDING: { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  VIEWED: { bg: '#e0f2fe', color: '#075985', label: 'Viewed' },
  APPROVED: { bg: '#dcfce7', color: '#166534', label: 'Approved' },
  CONFIRMED: { bg: '#d1fae5', color: '#065f46', label: 'Confirmed' },
  ESCROW_FUNDED: { bg: '#ede9fe', color: '#5b21b6', label: 'Escrow Funded' },
  ESCROW_COMPLETED: { bg: '#dcfce7', color: '#14532d', label: 'Completed' },
  CANCELLED: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  accepted: { bg: '#dcfce7', color: '#166534', label: 'Accepted' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
  pending: { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
};

const styles = {
  wrap: {
    border: '1px solid #e5e7eb',
    borderRadius: '1rem',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  } satisfies CSSProperties,
  header: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  } satisfies CSSProperties,
  heading: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#111827',
  } satisfies CSSProperties,
  count: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#6b7280',
  } satisfies CSSProperties,
  filters: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.4rem',
    padding: '0.75rem 1.25rem',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
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
  pagination: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.875rem 1.25rem',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    fontSize: '0.8rem',
    color: '#6b7280',
  } satisfies CSSProperties,
} as const;

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_COLORS[status] ?? { bg: '#f3f4f6', color: '#374151', label: status };
  return (
    <span
      style={{
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: meta.bg,
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  );
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCalendarDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function shortenWallet(addr: string): string {
  if (!addr || addr === '—' || addr.length <= 12) return addr || '—';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function InterestedPeopleTable({
  offers,
  totalCount,
  isLoading = false,
  statusFilter = 'ALL',
  onStatusFilterChange,
  page = 0,
  pageSize = 10,
  onPageChange,
  onAccept,
  onReject,
  actingOfferId = null,
}: InterestedPeopleTableProps) {
  const showActions = Boolean(onAccept || onReject);
  const colSpan = showActions ? 8 : 7;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (!isLoading && onPageChange && page > 0 && page >= totalPages) {
      onPageChange(totalPages - 1);
    }
  }, [isLoading, onPageChange, page, totalPages]);

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h3 style={styles.heading}>Interested tenants</h3>
        <p style={styles.count}>{totalCount} total</p>
      </div>

      {onStatusFilterChange && (
        <div style={styles.filters} role="tablist" aria-label="Filter offers by status">
          {FILTER_OPTIONS.map((option) => {
            const active = statusFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onStatusFilterChange(option.value)}
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  border: active ? '1px solid #f97316' : '1px solid #e5e7eb',
                  backgroundColor: active ? '#fff7ed' : '#ffffff',
                  color: active ? '#ea580c' : '#4b5563',
                  cursor: 'pointer',
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Wallet</th>
              <th style={styles.th}>Offer</th>
              <th style={styles.th}>Move-in</th>
              <th style={styles.th}>Submitted</th>
              <th style={styles.th}>Status</th>
              {showActions && <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={colSpan} style={styles.empty}>Loading…</td>
              </tr>
            )}
            {!isLoading && offers.length === 0 && (
              <tr>
                <td colSpan={colSpan} style={styles.empty}>No offers match this filter.</td>
              </tr>
            )}
            {!isLoading && offers.map((offer) => {
              const canAccept = offer.bid_status === 'PENDING' || offer.bid_status === 'VIEWED';
              const canReject =
                offer.bid_status === 'PENDING' ||
                offer.bid_status === 'VIEWED' ||
                offer.bid_status === 'APPROVED';
              const isActing = actingOfferId === offer.id;

              return (
                <tr key={offer.id}>
                  <td style={styles.td}>{offer.tenant_name}</td>
                  <td style={styles.td}>{offer.tenant_phone}</td>
                  <td style={styles.td}>
                    <code title={offer.tenant_wallet_address} style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {shortenWallet(offer.tenant_wallet_address)}
                    </code>
                  </td>
                  <td style={styles.td}>
                    {typeof offer.proposed_price === 'number'
                      ? `$${offer.proposed_price.toLocaleString('en-US')}`
                      : '—'}
                  </td>
                  <td style={styles.td}>{formatCalendarDate(offer.desired_move_in)}</td>
                  <td style={styles.td}>{formatDate(offer.offer_date)}</td>
                  <td style={styles.td}>
                    <StatusBadge status={offer.bid_status} />
                  </td>
                  {showActions && (
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        {onAccept && canAccept && (
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => onAccept(offer.id)}
                            aria-label={`Accept offer from ${offer.tenant_name}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.3rem 0.6rem',
                              borderRadius: '0.4rem',
                              border: '1px solid #bbf7d0',
                              backgroundColor: '#f0fdf4',
                              color: '#166534',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: isActing ? 'not-allowed' : 'pointer',
                              opacity: isActing ? 0.6 : 1,
                            }}
                          >
                            <Check size={13} />
                            Accept
                          </button>
                        )}
                        {onReject && canReject && (
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => onReject(offer.id)}
                            aria-label={`Reject offer from ${offer.tenant_name}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.3rem 0.6rem',
                              borderRadius: '0.4rem',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fef2f2',
                              color: '#991b1b',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: isActing ? 'not-allowed' : 'pointer',
                              opacity: isActing ? 0.6 : 1,
                            }}
                          >
                            <X size={13} />
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {onPageChange && (totalCount > pageSize || page > 0) && (
        <div style={styles.pagination}>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              disabled={page <= 0 || isLoading}
              onClick={() => onPageChange(page - 1)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.4rem',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                cursor: page <= 0 || isLoading ? 'not-allowed' : 'pointer',
                opacity: page <= 0 || isLoading ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page + 1 >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '0.4rem',
                border: '1px solid #d1d5db',
                backgroundColor: '#ffffff',
                cursor: page + 1 >= totalPages || isLoading ? 'not-allowed' : 'pointer',
                opacity: page + 1 >= totalPages || isLoading ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
