"use client";

import { InvoiceHeader } from '@/components/escrow/InvoiceHeader';
import { PdfExportButton } from '@/components/escrow/PdfExportButton';
import { ProcessStepper } from '@/components/escrow/ProcessStepper';
import { useQuery } from '@apollo/client';
import { GET_ESCROW_BY_ANY_ID } from '@/graphql/queries/escrow-queries';
import type { EscrowStatus } from '@/components/dashboard/EscrowStatusBadge';
import type { CSSProperties } from 'react';

type ViewConfig = {
  label: 'paid' | 'blocked' | 'released';
  step: 1 | 2 | 3 | 4;
  title: string;
};

const styles = {
  page: {
    maxWidth: '72rem',
    margin: '0 auto',
    padding: '2rem 1.5rem 3rem',
    color: '#111827',
  } satisfies CSSProperties,
  grid: {
    display: 'grid',
    gap: '1.5rem',
    marginTop: '1.5rem',
    alignItems: 'start',
  } satisfies CSSProperties,
  panel: {
    border: '1px solid #fed7aa',
    borderRadius: '1rem',
    backgroundColor: '#ffffff',
    padding: '1.5rem',
  } satisfies CSSProperties,
  splitGrid: {
    display: 'grid',
    gap: '1rem',
    gridTemplateColumns: 'repeat(auto-fit, minmax(13rem, 1fr))',
  } satisfies CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.95rem',
  } satisfies CSSProperties,
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: '0.75rem',
    padding: '0.75rem',
    font: 'inherit',
    resize: 'vertical',
    minHeight: '6rem',
  } satisfies CSSProperties,
  buttonRow: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.75rem',
    flexWrap: 'wrap',
  } satisfies CSSProperties,
  secondaryButton: {
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#111827',
    borderRadius: '0.75rem',
    padding: '0.6rem 1rem',
    fontWeight: 600,
  } satisfies CSSProperties,
  primaryButton: {
    border: '1px solid #22c55e',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    borderRadius: '0.75rem',
    padding: '0.6rem 1rem',
    fontWeight: 700,
  } satisfies CSSProperties,
} as const;

function getEscrowViewConfig(status: EscrowStatus): ViewConfig {
  switch (status) {
    case 'pending_signature':
      return { label: 'paid', step: 1, title: 'Invoice Pending Signature' };
    case 'active':
      return { label: 'paid', step: 2, title: 'Payment batch January 2025' };
    case 'funded':
      return { label: 'blocked', step: 3, title: 'Payment batch - Escrow Status' };
    case 'completed':
      return { label: 'released', step: 4, title: 'Deposit / Escrow Released' };
    default:
      return { label: 'paid', step: 1, title: 'Payment batch' };
  }
}

function formatDate(dateString?: string) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>{label}</p>
      <p style={{ margin: '0.35rem 0 0', fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function PaidStubView() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={styles.splitGrid}>
        <InfoPair label="Billed to" value="John_s@gmail.com" />
        <InfoPair label="Invoice Number" value="INV4257-09-012" />
        <InfoPair label="Billing details" value="John Smith" />
        <InfoPair label="Currency" value="IDR - Dollar" />
      </div>

      <div style={{ border: '1px solid #fed7aa', borderRadius: '1rem', overflow: 'hidden' }}>
        <table style={styles.table}>
          <thead style={{ backgroundColor: '#fff7ed' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '0.9rem' }}>PRODUCT</th>
              <th style={{ textAlign: 'right', padding: '0.9rem' }}>PRICE / MONTH</th>
              <th style={{ textAlign: 'right', padding: '0.9rem' }}>DEPOSIT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.9rem', borderTop: '1px solid #fed7aa' }}>La sabana apartment</td>
              <td style={{ padding: '0.9rem', textAlign: 'right', borderTop: '1px solid #fed7aa' }}>
                $4,000
              </td>
              <td style={{ padding: '0.9rem', textAlign: 'right', borderTop: '1px solid #fed7aa' }}>
                $4,000
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '0.95rem' }}>
        <strong>Total: $8,000</strong>
      </div>
    </div>
  );
}

function BlockedStubView() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={styles.splitGrid}>
        <InfoPair label="Creation date" value="25 January 2025" />
        <InfoPair label="Amount blocked" value="$4,000" />
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <h3 style={{ margin: 0 }}>Escrow Description</h3>
          <PdfExportButton />
        </div>
        <textarea style={styles.input} placeholder="Description..." />
      </div>

      <div
        style={{
          display: 'grid',
          gap: '1.5rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))',
          borderTop: '1px solid #fed7aa',
          paddingTop: '1.5rem',
        }}
      >
        <div>
          <h3 style={{ marginTop: 0 }}>Tenant Information</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoPair label="Tenant name" value="John Smith" />
            <InfoPair label="Wallet Address" value="MJE...XN32" />
            <InfoPair label="Email" value="John_s@gmail.com" />
          </div>
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>Owner Information</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoPair label="Owner name" value="Alberto Casas" />
            <InfoPair label="Wallet Address" value="MJE...XN32" />
            <InfoPair label="Email" value="albertoCasas100@gmail.com" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReleasedStubView() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <h3 style={{ margin: 0 }}>Escrow Justification</h3>
          <PdfExportButton />
        </div>
        <textarea style={styles.input} placeholder="Justification..." />
      </div>

      <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}>
        <div>
          <h3 style={{ marginTop: 0 }}>Beneficiary Information</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoPair label="Name" value="John Smith" />
            <InfoPair label="Wallet" value="MJE...XN32" />
            <InfoPair label="Released date" value="20 January 2025" />
            <InfoPair label="Deposit" value="$4,000" />
          </div>
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>Claims</h3>
          <textarea style={{ ...styles.input, minHeight: '5rem' }} placeholder="Claims..." />
          <div style={styles.buttonRow}>
            <button type="button" style={styles.secondaryButton}>
              Clean
            </button>
            <button type="button" style={styles.primaryButton}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EscrowDetailPage({
  params,
  searchParams,
}: {
  params: { id: string; escrowId: string };
  searchParams: { status?: string };
}) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.escrowId);

  const { data, loading, error } = useQuery(GET_ESCROW_BY_ANY_ID, {
    variables: {
      id: isUuid ? params.escrowId : null,
      engagement_id: params.escrowId,
      contract_id: params.escrowId,
    },
    pollInterval: 2000,
  });

  const escrow = data?.escrows?.[0];

  // Determine page content dynamically from Hasura or fallback to developer status query param
  let status: EscrowStatus;
  let invoiceNumber: string;
  let paidAt: string;

  if (escrow) {
    status = escrow.status as EscrowStatus;
    const rawId = escrow.engagement_id || escrow.contract_id || escrow.id || '';
    invoiceNumber = `INV-${rawId.slice(0, 12)}`;
    paidAt = formatDate(escrow.updated_at || escrow.created_at);
  } else {
    // Fallback stub status for styling and manual development verification
    const devStatus = searchParams?.status;
    if (devStatus === 'blocked') {
      status = 'funded';
    } else if (devStatus === 'released') {
      status = 'completed';
    } else if (devStatus === 'paid') {
      status = 'active';
    } else {
      status = 'pending_signature';
    }
    invoiceNumber = 'INV4257-09-012';
    paidAt = '25 Jan 2025';
  }

  const view = getEscrowViewConfig(status);

  // If loading and we have no cached data, display a nice loading state
  if (loading && !escrow) {
    return (
      <div style={styles.page}>
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          Loading escrow details...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <InvoiceHeader
        invoiceNumber={invoiceNumber}
        status={status}
        paidAt={paidAt}
      />

      <div style={{ ...styles.grid, gridTemplateColumns: 'minmax(0, 2fr) minmax(18rem, 1fr)' }}>
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
            Hotel {params.id}
          </p>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>{view.title}</h2>

          {view.label === 'paid' && <PaidStubView />}
          {view.label === 'blocked' && <BlockedStubView />}
          {view.label === 'released' && <ReleasedStubView />}
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={styles.panel}>
            <h3 style={{ marginTop: 0 }}>Notes</h3>
            <textarea style={styles.input} placeholder="Notes..." />
          </div>
          <ProcessStepper currentStep={view.step} />
        </div>
      </div>

      <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.85rem' }}>
        Dev: append ?status=paid|blocked|released
      </p>
    </div>
  );
}
