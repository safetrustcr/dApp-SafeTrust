import type { CSSProperties } from 'react';

type InvoiceStatus = 'paid' | 'blocked' | 'released';

const STATUS_STYLES: Record<InvoiceStatus, { label: string; style: CSSProperties }> = {
  paid: {
    label: 'Paid',
    style: {
      backgroundColor: '#ffedd5',
      color: '#9a3412',
      border: '1px solid #fdba74',
    },
  },
  blocked: {
    label: 'Deposit blocked',
    style: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fcd34d',
    },
  },
  released: {
    label: 'Deposit released',
    style: {
      backgroundColor: '#dcfce7',
      color: '#166534',
      border: '1px solid #86efac',
    },
  },
};

export function InvoiceHeader({
  invoiceNumber,
  paidAt,
  status,
}: {
  invoiceNumber: string;
  paidAt: string;
  status: InvoiceStatus;
}) {
  const badge = STATUS_STYLES[status];

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
            ...badge.style,
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: '999px',
            padding: '0.35rem 0.75rem',
            fontSize: '0.875rem',
            fontWeight: 700,
          }}
        >
          {badge.label}
        </span>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>Updated</p>
          <p style={{ margin: '0.25rem 0 0', fontWeight: 600 }}>{paidAt}</p>
        </div>
      </div>
    </div>
  );
}
