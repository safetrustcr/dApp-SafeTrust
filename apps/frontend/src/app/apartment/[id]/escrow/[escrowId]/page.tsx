"use client";

import { EscrowDetailLayout } from '@/components/escrow/EscrowDetailLayout';
import { InvoiceHeader } from '@/components/escrow/InvoiceHeader';
import { PaidInvoiceView } from '@/components/escrow/PaidInvoiceView';
import { PdfExportButton } from '@/components/escrow/PdfExportButton';
import { useQuery } from '@apollo/client';
import { GET_ESCROW_BY_ANY_ID } from '@/graphql/queries/escrow-queries';
import type { EscrowStatus } from '@/components/dashboard/EscrowStatusBadge';
import { truncateStellarAddress } from '@/lib/utils';
import { useState, type CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import {
  Bell,
  ChevronDown,
  CircleDollarSign,
  FileCheck2,
  Home,
  Search,
  ShieldCheck,
  User,
  WalletCards,
} from 'lucide-react';

type InvoiceApartment = {
  name: string;
  image_urls?: string[] | null;
};

type InvoiceEscrow = {
  apartment: InvoiceApartment;
};

type EscrowViewLabel = 'paid' | 'blocked' | 'released';

type ViewConfig = {
  label: EscrowViewLabel;
  title: string;
  step: number;
};

type EscrowRecord = {
  id?: string;
  contract_id?: string | null;
  engagement_id?: string | null;
  amount?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sender_address?: string | null;
  receiver_address?: string | null;
  resolution_notes?: string | null;
  tenant_wallet?: {
    user?: {
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      phone_number?: string | null;
      country_code?: string | null;
    } | null;
  } | null;
  apartment?: {
    name?: string | null;
    image_urls?: string[] | null;
    description?: string | null;
    price?: number | null;
    owner?: {
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      phone_number?: string | null;
      country_code?: string | null;
    } | null;
  } | null;
};

const STUB_INVOICE_ESCROW: InvoiceEscrow = {
  apartment: {
    name: 'La sabana apartment',
    image_urls: [],
  },
};

const styles = {
  pageWrapper: {
    backgroundColor: '#eeeeee',
    minHeight: '100vh',
  } satisfies CSSProperties,
  topBar: {
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  } satisfies CSSProperties,
  topBarInner: {
    maxWidth: '76rem',
    minHeight: '4.5rem',
    margin: '0 auto',
    padding: '0 2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1.5rem',
  } satisfies CSSProperties,
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#202124',
    fontSize: '1.65rem',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  } satisfies CSSProperties,
  searchBar: {
    flex: '1 1 28rem',
    maxWidth: '31rem',
    minWidth: '16rem',
    height: '2rem',
    borderRadius: '999px',
    backgroundColor: '#d9d9d9',
    display: 'flex',
    alignItems: 'center',
    padding: '0 0.75rem',
    color: '#555',
  } satisfies CSSProperties,
  searchMode: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    borderRight: '1px solid #b9b9b9',
    paddingRight: '0.8rem',
    marginRight: '0.8rem',
    fontSize: '0.8rem',
    color: '#111827',
  } satisfies CSSProperties,
  userNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    whiteSpace: 'nowrap',
  } satisfies CSSProperties,
  page: {
    maxWidth: '76rem',
    margin: '0 auto',
    padding: '2.2rem 2rem 3.5rem',
    color: '#202124',
  } satisfies CSSProperties,
  invoiceHeading: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    flexWrap: 'wrap',
  } satisfies CSSProperties,
  grid: {
    display: 'grid',
    gap: '1.75rem',
    marginTop: '2rem',
    alignItems: 'start',
  } satisfies CSSProperties,
  leftPanel: {
    backgroundColor: '#ffffff',
    border: '1px solid #d4d4d4',
    borderRadius: '0.35rem',
    padding: '1.75rem',
  } satisfies CSSProperties,
  rightPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    paddingTop: '1.55rem',
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
    border: '1px solid #d8d8d8',
    borderRadius: '0.35rem',
    padding: '1rem 1.1rem',
    font: 'inherit',
    fontSize: '0.78rem',
    resize: 'none',
    minHeight: '6rem',
    backgroundColor: '#ffffff',
    color: '#5f6368',
    lineHeight: 1.28,
  } satisfies CSSProperties,
  buttonRow: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.75rem',
    flexWrap: 'wrap',
  } satisfies CSSProperties,
  divider: {
    border: 'none',
    borderTop: '1px solid #cfcfcf',
    margin: '1rem 0 1.7rem',
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

const STATUS_LABELS: Record<EscrowStatus, string> = {
  pending_signature: 'Deposit pending',
  active: 'Deposit paid',
  funded: 'Deposit blocked',
  completed: 'Deposit released',
  disputed: 'Deposit disputed',
  resolved: 'Deposit resolved',
  cancelled: 'Deposit cancelled',
};

const STATUS_COLORS: Record<EscrowStatus, { backgroundColor: string; color: string }> = {
  pending_signature: { backgroundColor: '#ffe2e2', color: '#b91c1c' },
  active: { backgroundColor: '#dcfce7', color: '#166534' },
  funded: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  completed: { backgroundColor: '#def35b', color: '#577004' },
  disputed: { backgroundColor: '#fee2e2', color: '#991b1b' },
  resolved: { backgroundColor: '#ede9fe', color: '#6d28d9' },
  cancelled: { backgroundColor: '#e5e7eb', color: '#4b5563' },
};

const PROCESS_STEPS = [
  {
    step: 1,
    title: 'Escrow created',
    body: 'Agreement details and beneficiary information were prepared for the escrow.',
    icon: ShieldCheck,
  },
  {
    step: 2,
    title: 'Deposit paid',
    body: 'The rental deposit was received and linked to this invoice.',
    icon: WalletCards,
  },
  {
    step: 3,
    title: 'Deposit held',
    body: 'Funds were kept in escrow while the rental conditions were verified.',
    icon: Home,
  },
  {
    step: 4,
    title: 'Deposit released',
    body: 'The approved amount was released to the beneficiary wallet.',
    icon: FileCheck2,
  },
] as const;

function getEscrowViewConfig(status: EscrowStatus): ViewConfig {
  switch (status) {
    case 'funded':
      return {
        label: 'blocked',
        title: 'Payment batch - Escrow Status',
        step: 3,
      };
    case 'completed':
    case 'resolved':
      return {
        label: 'released',
        title: 'Deposit / Escrow Released',
        step: 4,
      };
    case 'active':
    case 'pending_signature':
    default:
      return {
        label: 'paid',
        title: 'Payment batch January 2025',
        step: 2,
      };
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

function StatusPill({ status }: { status: EscrowStatus }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: '2rem',
        borderRadius: '0.8rem',
        padding: '0 1rem',
        fontSize: '0.82rem',
        fontWeight: 700,
        ...STATUS_COLORS[status],
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function PageTopBar() {
  return (
    <header style={styles.topBar}>
      <div style={styles.topBarInner}>
        <div style={styles.brand}>
          <Image src="/img/logo.png" alt="SafeTrust" width={44} height={44} priority />
          <span>SafeTrust</span>
        </div>

        <div style={styles.searchBar}>
          <div style={styles.searchMode}>
            <span>Rent</span>
            <ChevronDown size={14} strokeWidth={2.4} />
          </div>
          <span style={{ flex: 1, color: '#6f7275', fontSize: '0.78rem' }}>
            City, province or neighborhood
          </span>
          <Search size={17} color="#555" strokeWidth={2.2} />
        </div>

        <div style={styles.userNav}>
          <Bell size={19} color="#111827" />
          <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>Randall Valenciano</span>
          <div
            aria-label="User profile"
            style={{
              width: '2.35rem',
              height: '2.35rem',
              borderRadius: '999px',
              border: '1px solid #111827',
              backgroundColor: '#e8e8e8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={22} color="#111827" />
          </div>
        </div>
      </div>
    </header>
  );
}

function ProcessTimeline({ currentStep }: { currentStep: 1 | 2 | 3 | 4 }) {
  return (
    <div style={{ display: 'grid', gap: '1.55rem' }}>
      {PROCESS_STEPS.map(({ step, title, body, icon: Icon }, index) => {
        const isReached = step <= currentStep;
        const markerColor = isReached ? '#4ff291' : '#d8d8d8';
        const lineColor = isReached && step < currentStep ? '#5ddf94' : '#d0d0d0';

        return (
          <div key={step} style={{ display: 'grid', gridTemplateColumns: '2.4rem 1fr', gap: '1rem' }}>
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              {index < PROCESS_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    top: '1.75rem',
                    bottom: '-1.55rem',
                    width: '1px',
                    backgroundColor: lineColor,
                  }}
                />
              )}
              <span
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '999px',
                  backgroundColor: markerColor,
                  color: '#057a46',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #23ca76',
                }}
              >
                <Icon size={14} strokeWidth={2.1} />
              </span>
            </div>
            <div style={{ paddingTop: '0.12rem' }}>
              <p style={{ margin: 0, color: '#5f6368', fontSize: '0.79rem', lineHeight: 1.35 }}>
                <strong style={{ display: 'block', color: '#3c4043', marginBottom: '0.2rem' }}>{title}</strong>
                {body}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
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

function PaidStubView({ escrow }: { escrow?: EscrowRecord | null }) {
  const apartment = escrow?.apartment ?? STUB_INVOICE_ESCROW.apartment;
  const invoiceNumber = escrow?.engagement_id
    ? `INV-${escrow.engagement_id.slice(0, 12)}`
    : 'INV4257-09-012';
  const tenantEmail = escrow?.tenant_wallet?.user?.email ?? 'John_s@gmail.com';
  const tenantName = escrow?.tenant_wallet?.user
    ? `${escrow.tenant_wallet.user.first_name ?? ''} ${escrow.tenant_wallet.user.last_name ?? ''}`.trim()
    : 'John Smith';
  const monthlyPrice = escrow?.apartment?.price ?? 4000;
  const depositAmount = escrow?.amount ?? monthlyPrice;

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={styles.splitGrid}>
        <InfoPair label="Billed to" value={tenantEmail} />
        <InfoPair label="Invoice Number" value={invoiceNumber} />
        <InfoPair label="Billing details" value={tenantName || 'Tenant'} />
        <InfoPair label="Currency" value="USD - Dollar" />
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
                <ProductCell apartment={apartment} />
              </td>
              <td style={{ padding: '0.9rem', textAlign: 'right', borderTop: '1px solid #fed7aa' }}>
                ${monthlyPrice.toLocaleString()}
              </td>
              <td style={{ padding: '0.9rem', textAlign: 'right', borderTop: '1px solid #fed7aa' }}>
                ${depositAmount.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '0.95rem' }}>
        <strong>Total: ${(monthlyPrice + depositAmount).toLocaleString()}</strong>
      </div>
    </div>
  );
}

function BlockedStubView({ escrow }: { escrow?: EscrowRecord | null }) {
  const createdAt = escrow?.created_at
    ? formatDate(escrow.created_at)
    : '25 January 2025';
  const blockedAmount = escrow?.amount
    ? `$${escrow.amount.toLocaleString()}`
    : '$4,000';
  const tenantUser = escrow?.tenant_wallet?.user;
  const ownerUser = escrow?.apartment?.owner;

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={styles.splitGrid}>
        <InfoPair label="Creation date" value={createdAt} />
        <InfoPair label="Amount blocked" value={blockedAmount} />
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
          borderTop: '1px solid #e5e7eb',
          paddingTop: '1.5rem',
        }}
      >
        <div>
          <h3 style={{ marginTop: 0 }}>Tenant Information</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoPair label="Tenant name" value={
              tenantUser
                ? `${tenantUser.first_name ?? ''} ${tenantUser.last_name ?? ''}`.trim() || 'Tenant'
                : 'John Smith'
            } />
            <InfoPair label="Wallet Address" value={
              <span title={escrow?.sender_address ?? undefined}>
                {truncateStellarAddress(escrow?.sender_address ?? 'MJE1234567890ABCDEF1234567890ABCDEFXN32')}
              </span>
            } />
            <InfoPair label="Email" value={tenantUser?.email ?? 'John_s@gmail.com'} />
          </div>
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>Owner Information</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoPair label="Owner name" value={
              ownerUser
                ? `${ownerUser.first_name ?? ''} ${ownerUser.last_name ?? ''}`.trim() || 'Owner'
                : 'Alberto Casas'
            } />
            <InfoPair label="Wallet Address" value={
              <span title={escrow?.receiver_address ?? undefined}>
                {truncateStellarAddress(escrow?.receiver_address ?? 'MJE1234567890ABCDEF1234567890ABCDEFXN32')}
              </span>
            } />
            <InfoPair label="Email" value={ownerUser?.email ?? 'albertoCasas100@gmail.com'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.78rem', marginBottom: '0.85rem' }}>
      <div style={{ width: '8rem', color: '#6f7275' }}>{label}</div>
      <div style={{ fontWeight: 800, color: '#202124', wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

function ReleasedView({ escrow }: { escrow?: EscrowRecord | null }) {
  const isMock = !escrow;

  const justification = isMock
    ? "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book"
    : (escrow.resolution_notes || escrow.apartment?.description || "Deposit released.");

  const ownerUser = escrow?.apartment?.owner;
  const beneficiaryName = isMock
    ? "Alberto Casas"
    : (ownerUser ? `${ownerUser.first_name || ''} ${ownerUser.last_name || ''}`.trim() : "Owner");

  const beneficiaryWallet = isMock
    ? "MJE...XN32"
    : (escrow.receiver_address ? truncateStellarAddress(escrow.receiver_address) : "N/A");

  const releasedDate = isMock
    ? "20 January 2025"
    : formatDate(escrow.updated_at || escrow.created_at);

  const depositAmount = isMock
    ? "$4,000"
    : (escrow.amount ? `$${escrow.amount.toLocaleString()}` : "$0");

  const email = isMock
    ? "albertoCasas100@gmail.com"
    : (ownerUser?.email || "N/A");

  const phone = isMock
    ? "+506 64895321"
    : (ownerUser?.phone_number
      ? `${ownerUser.country_code ? `+${ownerUser.country_code.replace(/^\+/, '')} ` : ''}${ownerUser.phone_number}`
      : "N/A");

  return (
    <div style={{ display: 'grid', gap: '1.6rem' }}>
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Escrow Justification</h3>
          <PdfExportButton />
        </div>
        <textarea
          id="escrow-justification"
          style={{ ...styles.input, minHeight: '6.35rem' }}
          value={justification}
          readOnly
        />
      </div>

      <div className="released-inner-grid" style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'minmax(14rem, 0.9fr) minmax(16rem, 1fr)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '1.3rem', fontSize: '1rem', fontWeight: 800 }}>Beneficiary Information</h3>
            <div>
              <DetailRow label="Name" value={beneficiaryName} />
              <DetailRow label="Wallet Address" value={beneficiaryWallet} />
              <DetailRow label="Released date" value={releasedDate} />
              <DetailRow label="Deposit amount" value={depositAmount} />
            </div>
          </div>

          <div>
            <h3 style={{ marginTop: 0, marginBottom: '1.3rem', fontSize: '1rem', fontWeight: 800 }}>Beneficiary contact</h3>
            <div>
              <DetailRow label="Phone" value={phone} />
              <DetailRow label="Email Address" value={email} />
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ marginTop: '1.15rem', marginBottom: '0.9rem', fontSize: '1rem', fontWeight: 800 }}>Claims</h3>
          <textarea
            id="escrow-claims-input"
            style={{ ...styles.input, minHeight: '6.7rem' }}
            placeholder="Lorem Ipsum is simply dummy text of the printing and typesetting industry..."
            value=""
            readOnly
          />
          <div style={{ ...styles.buttonRow, justifyContent: 'flex-end', marginTop: '0.85rem' }}>
            <button
              id="escrow-claims-clean-btn"
              type="button"
              disabled
              style={{
                border: 'none',
                backgroundColor: '#d1d5db',
                color: '#9ca3af',
                borderRadius: '0.35rem',
                padding: '0.45rem 1.15rem',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'not-allowed',
                transition: 'all 0.2s',
                opacity: 0.6,
              }}
            >
              Clean
            </button>
            <button
              id="escrow-claims-send-btn"
              type="button"
              disabled
              style={{
                border: 'none',
                backgroundColor: '#d1d5db',
                color: '#9ca3af',
                borderRadius: '0.35rem',
                padding: '0.45rem 1.15rem',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'not-allowed',
                transition: 'all 0.2s',
                opacity: 0.6,
              }}
            >
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

  let status: EscrowStatus;
  let invoiceNumber: string;
  let paidAt: string;

  if (escrow) {
    status = escrow.status as EscrowStatus;
    const rawId = escrow.engagement_id || escrow.contract_id || escrow.id || '';
    invoiceNumber = `INV-${rawId.slice(0, 12)}`;
    paidAt = formatDate(escrow.updated_at || escrow.created_at);
  } else {
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

  if (loading && !escrow) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.page}>
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            Loading escrow details...
          </div>
        </div>
      </div>
    );
  }

  if (error && !escrow) {
    return (
      <div style={styles.pageWrapper}>
        <div style={styles.page}>
          <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626', backgroundColor: '#fee2e2', borderRadius: '0.5rem', border: '1px solid #fecaca' }}>
            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>Error Loading Escrow</h2>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{error.message || 'Failed to load escrow details. Please try again later.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.pageWrapper}>
      <style>{`
        textarea {
          scrollbar-width: none;
          -ms-overflow-style: none;
          overflow-y: auto;
        }
        textarea::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        textarea::-webkit-scrollbar-track {
          background: transparent;
        }
        textarea::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 4px;
        }
        textarea:hover::-webkit-scrollbar-thumb {
          background: #cccccc;
        }
        @media (max-width: 1024px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .released-inner-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .responsive-page {
            padding: 1.5rem 1rem 2.5rem !important;
          }
        }
      `}</style>
      <div className="responsive-page" style={styles.page}>
        <div>
          <div style={styles.invoiceHeading}>
            <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 900, letterSpacing: '0.02em' }}>
              {invoiceNumber}
            </h1>
            <StatusPill status={status} />
          </div>
          {paidAt && (
            <p style={{ margin: '0.6rem 0 0', color: '#6f7275', fontSize: '0.82rem' }}>
              Paid at {paidAt}
            </p>
          )}
        </div>

        <div className="responsive-grid" style={{ ...styles.grid, gridTemplateColumns: 'minmax(0, 2.05fr) minmax(18rem, 1fr)' }}>
          <div style={styles.leftPanel}>
            <h2 style={{ marginTop: 0, marginBottom: '0.9rem', fontSize: '1.55rem', fontWeight: 900 }}>
              {view.title}
            </h2>

            <hr style={styles.divider} />

            {view.label === 'paid' && <PaidStubView escrow={escrow} />}
            {view.label === 'blocked' && <BlockedStubView escrow={escrow} />}
            {view.label === 'released' && <ReleasedView escrow={escrow} />}
          </div>

          <div style={styles.rightPanel}>
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '1.15rem', fontSize: '1.1rem', fontWeight: 900 }}>Notes</h3>
              <textarea
                id="escrow-notes-input"
                style={{ ...styles.input, minHeight: '6.9rem' }}
                placeholder="Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s..."
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #c5c5c5', margin: '0' }} />

            <div>
              <h3 style={{ marginTop: 0, marginBottom: '1.45rem', fontSize: '1.1rem', fontWeight: 900 }}>Process</h3>
              <ProcessTimeline currentStep={view.step} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
