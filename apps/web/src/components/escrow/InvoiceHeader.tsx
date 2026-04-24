// TODO: replace with real InvoiceHeader once merged in frontend-SafeTrust
// Source: frontend-SafeTrust/src/components/escrow/InvoiceHeader.tsx

import type { CSSProperties } from 'react';

const STATUS_STYLES: Record<string, CSSProperties> = {
  pending: {
    backgroundColor: '#fce7f3',
    color: '#9d174d',
    border: '1px solid #f9a8d4',
  },
  paid: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    border: '1px solid #86efac',
  },
  blocked: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    border: '1px solid #93c5fd',
  },
  released: {
    backgroundColor: '#ecfccb',
    color: '#3f6212',
    border: '1px solid #bef264',
  },
};

export function InvoiceHeader({
  invoiceNumber,
  status,
  paidAt,
}: {
  invoiceNumber: string;
  status: 'pending' | 'paid' | 'blocked' | 'released';
  paidAt?: string;
}) {
  const label =
    status === 'pending'
      ? 'Pending'
      : status === 'paid'
        ? 'Paid'
        : status === 'blocked'
          ? 'Deposit blocked'
          : 'Deposit released';

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1.25rem 1.5rem',
        borderRadius: '1rem',
        border: '1px solid #fed7aa',
        backgroundColor: '#ffffff',
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#9ca3af',
          }}
        >
          Invoice number
        </p>
        <h1 style={{ margin: '0.35rem 0 0', fontSize: '1.75rem' }}>{invoiceNumber}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span
          style={{
            ...STATUS_STYLES[status],
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: '999px',
            padding: '0.35rem 0.75rem',
            fontSize: '0.875rem',
            fontWeight: 700,
          }}
        >
          {label}
        </span>
      </div>
      {paidAt && <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>Paid at {paidAt}</p>}
    </div>
  );
}
