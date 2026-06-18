// TODO: replace stub content with real escrow detail views once merged in frontend-SafeTrust

import { EscrowDetailLayout } from '@/components/escrow/EscrowDetailLayout';
import type { EscrowDetailStatus } from '@/components/escrow/EscrowDetailLayout';
import type { CSSProperties } from 'react';

const styles = {
  page: {
    padding: '0.5rem 0 2rem',
    color: '#111827',
  } satisfies CSSProperties,
  panel: {
    border: '1px solid #fed7aa',
    borderRadius: '1rem',
    backgroundColor: '#ffffff',
    padding: '1.5rem',
  } satisfies CSSProperties,
} as const;

function normalizeStatus(status: string | string[] | undefined): EscrowDetailStatus {
  const normalizedStatus = (Array.isArray(status) ? status[0] : status)?.trim().toLowerCase();
  switch (normalizedStatus) {
    case 'funded':
    case 'paid':
      return 'paid';
    case 'active':
    case 'blocked':
      return 'blocked';
    case 'completed':
    case 'released':
      return 'released';
    case 'pending_signature':
    case 'deploying':
    case 'pending':
    default:
      return 'pending';
  }
}

export default function DashboardEscrowDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { status?: string | string[] };
}) {
  const status = normalizeStatus(searchParams?.status);

  return (
    <div style={styles.page}>
      <EscrowDetailLayout
        invoiceNumber={`INV-${params.id.slice(0, 8).toUpperCase()}`}
        status={status}
        paidAt={status === 'pending' ? undefined : `Escrow ${params.id.slice(0, 8)}`}
      >
        <div style={styles.panel}>
          <p
            style={{
              marginTop: 0,
              marginBottom: '0.5rem',
              fontSize: '0.8rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#9ca3af',
            }}
          >
            Escrow detail
          </p>
          <h2 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.5rem' }}>
            {status === 'pending' && 'Pending escrow'}
            {status === 'paid' && 'Payment batch'}
            {status === 'blocked' && 'Deposit blocked'}
            {status === 'released' && 'Deposit released'}
          </h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.95rem' }}>
            Main content for the {status} view will render here.
          </p>
        </div>
      </EscrowDetailLayout>
    </div>
  );
}
