import { EscrowPayFlow } from '@/components/escrow/EscrowPayFlow';
import { EscrowDetailLayout } from '@/components/escrow/EscrowDetailLayout';
import type { CSSProperties } from 'react';
"use client";

import { useQuery } from "@apollo/client";
import { ApartmentPropertyCard } from "@/components/escrow/ApartmentPropertyCard";
import { EscrowPayFlow } from "@/components/escrow/EscrowPayFlow";
import { InvoiceHeader } from "@/components/escrow/InvoiceHeader";
import { ProcessStepper } from "@/components/escrow/ProcessStepper";
import { GET_APARTMENT_BY_ID } from "@/graphql/queries/apartment-queries";
import type { CSSProperties } from "react";

const styles = {
  page: {
    maxWidth: "72rem",
    margin: "0 auto",
    padding: "2rem 1.5rem 3rem",
    color: "#111827",
  } satisfies CSSProperties,
  grid: {
    gap: "1.5rem",
    marginTop: "1.5rem",
    alignItems: "start",
  } satisfies CSSProperties,
  panel: {
    border: "1px solid #fed7aa",
    borderRadius: "1rem",
    backgroundColor: "#ffffff",
    padding: "1.5rem",
  } satisfies CSSProperties,
  sidebar: {
    display: "grid",
    gap: "1rem",
  } satisfies CSSProperties,
  label: {
    display: "block",
    marginBottom: "0.5rem",
    fontWeight: 600,
  } satisfies CSSProperties,
  input: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "0.75rem",
    padding: "0.75rem",
    font: "inherit",
    resize: "vertical",
    minHeight: "6rem",
  } satisfies CSSProperties,
  mutedText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.9rem",
  } satisfies CSSProperties,
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ApartmentData = {
  id: string;
  name: string;
  description?: string | null;
  image_urls?: string[] | null;
  address?: {
    street?: string;
    neighborhood?: string;
    city?: string;
  } | null;
  price: number;
  owner_id: string;
};

export default function EscrowCreatePage({
  params,
}: {
  params: { id: string };
}) {
  const isValidId = UUID_RE.test(params.id);

  const { data, loading, error } = useQuery<{ apartments: ApartmentData[] }>(
    GET_APARTMENT_BY_ID,
    { variables: { id: params.id }, skip: !isValidId }
  );

  const apartment = data?.apartments[0] ?? null;

  return (
    <div style={styles.page}>
      <EscrowDetailLayout invoiceNumber="INV4257-09-012" status="pending">
        <div style={{ ...styles.panel, display: 'grid', gap: '1rem' }}>
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
      <InvoiceHeader invoiceNumber="INV4257-09-012" status="pending" />

      <div className="grid grid-cols-1 lg:grid-cols-3" style={styles.grid}>
        <div className="lg:col-span-2" style={{ ...styles.panel, display: "grid", gap: "1rem" }}>
          {loading && (
            <p style={styles.mutedText}>Loading property details…</p>
          )}

          {error && (
            <p style={{ margin: 0, color: "#b91c1c", fontSize: "0.9rem" }}>
              Failed to load property details.
            </p>
          )}

          <div>
            <h3 style={{ marginTop: 0, marginBottom: '0.35rem', fontSize: '1rem' }}>Owner contact</h3>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>Phone: +1 555-0100</p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '0.95rem' }}>Email: owner@example.com</p>
          </div>
          {apartment && (
            <ApartmentPropertyCard
              name={apartment.name}
              imageUrls={apartment.image_urls}
              address={apartment.address}
              description={apartment.description}
              paySlot={
                <EscrowPayFlow
                  apartmentId={params.id}
                  apartmentName={apartment.name}
                  // TODO: replace with owner's Stellar wallet from users_wallets once wired
                  ownerAddress={apartment.owner_id}
                  amount={apartment.price}
                />
              }
            />
          )}

          {(!isValidId || (!loading && !error && !apartment)) && (
            <p style={styles.mutedText}>Property not found.</p>
          )}

          {apartment && (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: "0.35rem", fontSize: "1rem" }}>
                Owner contact
              </h3>
              <p style={{ margin: 0, fontSize: "0.95rem" }}>
                Wallet: {apartment.owner_id}
              </p>
            </div>
          )}
        </div>

        <div style={styles.sidebar}>
          <div style={styles.panel}>
            <label htmlFor="escrow-notes" style={styles.label}>
              Notes
            </label>
            <textarea
              id="escrow-notes"
              style={styles.input}
              placeholder="Add notes…"
            />
          </div>
          <ProcessStepper currentStep={1} />
        </div>
      </EscrowDetailLayout>
    </div>
  );
}
