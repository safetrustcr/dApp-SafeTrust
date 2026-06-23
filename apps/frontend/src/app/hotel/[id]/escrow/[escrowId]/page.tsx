"use client";

import { EscrowDetailLayout } from '@/components/escrow/EscrowDetailLayout';
import { InvoiceHeader } from '@/components/escrow/InvoiceHeader';
import { PaidInvoiceView } from '@/components/escrow/PaidInvoiceView';
import { PdfExportButton } from '@/components/escrow/PdfExportButton';
import { ProcessStepper } from '@/components/escrow/ProcessStepper';
import { useQuery } from '@apollo/client';
import { GET_ESCROW_BY_ANY_ID } from '@/graphql/queries/escrow-queries';
import type { EscrowStatus } from '@/components/dashboard/EscrowStatusBadge';
import { truncateStellarAddress } from '@/lib/utils';
import type { CSSProperties, ReactNode } from 'react';

type InvoiceApartment = {
  name: string;
  image_urls?: string[] | null;
};

type InvoiceEscrow = {
  apartment: InvoiceApartment;
};

type ViewConfig = {
  label: StubStatus;
  title: string;
};

const STUB_INVOICE_ESCROW: InvoiceEscrow = {
  apartment: {
    name: 'La sabana apartment',
    image_urls: [],
  },
};

const styles = {
  pageBg: {
    backgroundColor: '#f3f4f6',
    minHeight: '100vh',
  } satisfies CSSProperties,
  page: {
    maxWidth: '72rem',
    margin: '0 auto',
    padding: '2rem 1.5rem 3rem',
    color: '#111827',
  } satisfies CSSProperties,
  panel: {
    border: '1px solid #e5e7eb',
    borderRadius: '1rem',
    backgroundColor: '#ffffff',
    padding: '1.75rem',
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
  productCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  } satisfies CSSProperties,
  productThumbnail: {
    width: '40px',
    height: '40px',
    borderRadius: '0.5rem',
    objectFit: 'cover',
    flexShrink: 0,
  } satisfies CSSProperties,
  productThumbnailFallback: {
    width: '40px',
    height: '40px',
    borderRadius: '0.5rem',
    backgroundColor: '#fff7ed',
    color: '#f97316',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } satisfies CSSProperties,
} as const;

function getEscrowViewConfig(status: EscrowStatus): ViewConfig {
  switch (status) {
    case 'blocked':
      return { label: 'blocked', title: 'Payment batch - Escrow Status' };
    case 'released':
      return { label: 'released', title: 'Deposit / Escrow Released' };
    case 'paid':
    default:
      return { label: 'paid', title: 'Payment batch January 2025' };
  }
}

function formatDate(dateString?: string) {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function InfoPair({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>{label}</p>
      <p style={{ margin: '0.35rem 0 0', fontWeight: 600 }}>{value}</p>
    </div>
  );
}

function ProductCell({ apartment }: { apartment: InvoiceApartment }) {
  const imageUrl = apartment.image_urls?.[0];

  return (
    <div style={styles.productCell}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={apartment.name} style={styles.productThumbnail} />
      ) : (
        <span aria-hidden="true" style={styles.productThumbnailFallback}>
          <Home size={20} strokeWidth={2} />
        </span>
      )}
      <span>{apartment.name}</span>
    </div>
  );
}

function PaidStubView() {
  const escrow = STUB_INVOICE_ESCROW;

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
              <td style={{ padding: '0.9rem', borderTop: '1px solid #fed7aa' }}>
                <ProductCell apartment={escrow.apartment} />
              </td>
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
            <InfoPair label="Wallet Address" value={<span title="MJE1234567890ABCDEF1234567890ABCDEFXN32">{truncateStellarAddress("MJE1234567890ABCDEF1234567890ABCDEFXN32")}</span>} />
            <InfoPair label="Email" value="John_s@gmail.com" />
          </div>
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>Owner Information</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoPair label="Owner name" value="Alberto Casas" />
            <InfoPair label="Wallet Address" value={<span title="MJE1234567890ABCDEF1234567890ABCDEFXN32">{truncateStellarAddress("MJE1234567890ABCDEF1234567890ABCDEFXN32")}</span>} />
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
            <InfoPair label="Wallet" value={<span title="MJE1234567890ABCDEF1234567890ABCDEFXN32">{truncateStellarAddress("MJE1234567890ABCDEF1234567890ABCDEFXN32")}</span>} />
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

  return (
    <div style={styles.page}>
      <EscrowDetailLayout
        invoiceNumber="INV4257-09-012"
        status={view.label}
        paidAt={`${params.escrowId} · 25 Jan 2025`}
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
            Hotel {params.id}
          </p>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>{view.title}</h2>

          {/* TODO: swap placeholder sections for real escrow views once frontend-SafeTrust is merged */}
          {view.label === 'paid' && <PaidStubView />}
          {view.label === 'blocked' && <BlockedStubView />}
          {view.label === 'released' && <ReleasedStubView />}
        </div>
      </EscrowDetailLayout>

        <p style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.85rem' }}>
          Dev: append ?status=paid|blocked|released
        </p>
      </div>
    </div>
  );
}
