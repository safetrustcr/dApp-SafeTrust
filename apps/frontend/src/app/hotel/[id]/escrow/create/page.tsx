import { EscrowPayFlow } from '@/components/escrow/EscrowPayFlow';
import { InvoiceHeader } from '@/components/escrow/InvoiceHeader';
import { ProcessStepper } from '@/components/escrow/ProcessStepper';
import type { CSSProperties } from 'react';

const STUB_APARTMENT = {
  id: 'la-sabana',
  name: 'La sabana',
  address: '329 Calle santos, paseo colon, San Jose',
  price: 4000,
  owner: {
    walletAddress: 'GDUMR3GDOAWAJXFYB7BLMCQQX4FGXJQ3NGPBHPBWKWJRG4ZL2RKIUJL',
  },
};

const styles = {
  page: {
    maxWidth: '72rem',
    margin: '0 auto',
    padding: '2rem 1.5rem 3rem',
    color: '#111827',
  } satisfies CSSProperties,
  grid: {
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
  headingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  } satisfies CSSProperties,
  payButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  } satisfies CSSProperties,
  imageGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    gap: '0.5rem',
  } satisfies CSSProperties,
  imagePlaceholder: {
    height: '5rem',
    borderRadius: '0.75rem',
    backgroundColor: '#fed7aa',
  } satisfies CSSProperties,
  detailsRow: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    fontSize: '0.95rem',
  } satisfies CSSProperties,
  mutedText: {
    margin: 0,
    color: '#6b7280',
    fontSize: '0.9rem',
  } satisfies CSSProperties,
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 600,
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
  sidebar: {
    display: 'grid',
    gap: '1rem',
  } satisfies CSSProperties,
} as const;

export default function EscrowCreatePage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div style={styles.page}>
      <InvoiceHeader invoiceNumber="INV4257-09-012" status="pending" />

      <div className="grid grid-cols-1 lg:grid-cols-3" style={styles.grid}>
        <div className="lg:col-span-2" style={{ ...styles.panel, display: 'grid', gap: '1rem' }}>
          <div style={styles.headingRow}>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', letterSpacing: '0.08em', color: '#9ca3af' }}>
                HOTEL {params.id}
              </p>
              <h2 style={{ marginTop: '0.35rem', marginBottom: 0, fontSize: '1.5rem' }}>{STUB_APARTMENT.name}</h2>
            </div>
            <div style={styles.payButton}>
              <EscrowPayFlow
                apartmentId={params.id}
                apartmentName={STUB_APARTMENT.name}
                ownerAddress={STUB_APARTMENT.owner.walletAddress}
                amount={STUB_APARTMENT.price}
              />
            </div>
          </div>

          <div style={styles.imageGrid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={styles.imagePlaceholder} />
            ))}
          </div>

          <p style={styles.mutedText}>Address: {STUB_APARTMENT.address}</p>
          <div style={styles.detailsRow}>
            <span>2 bd</span>
            <span>pet friendly</span>
            <span>1 ba</span>
          </div>

          <div>
            <h3 style={{ marginTop: 0, marginBottom: '0.35rem', fontSize: '1rem' }}>Property details</h3>
            <p style={styles.mutedText}>
              Beautiful apartment in the heart of San Jose.
            </p>
          </div>

          <div>
            <h3 style={{ marginTop: 0, marginBottom: '0.35rem', fontSize: '1rem' }}>Owner contact</h3>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>Phone: +1 555-0100</p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.95rem' }}>Email: owner@example.com</p>
          </div>

        </div>

        <div style={styles.sidebar}>
          <div style={styles.panel}>
            <label htmlFor="escrow-notes" style={styles.label}>
              Notes
            </label>
            <textarea
              id="escrow-notes"
              style={styles.input}
              placeholder="Add notes..."
            />
          </div>
          <ProcessStepper currentStep={1} />
        </div>
      </div>
    </div>
  );
}
