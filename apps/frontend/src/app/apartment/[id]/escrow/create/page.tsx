"use client";

import { useQuery } from "@apollo/client";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { ApartmentPropertyCard } from "@/components/escrow/ApartmentPropertyCard";
import { EscrowDetailLayout } from "@/components/escrow/EscrowDetailLayout";
import { EscrowPayFlow } from "@/components/escrow/EscrowPayFlow";
import { GET_APARTMENT_BY_ID } from "@/graphql/queries/apartment-queries";

const styles = {
  page: {
    maxWidth: "72rem",
    margin: "0 auto",
    padding: "2rem 1.5rem 3rem",
    color: "#111827",
  } satisfies CSSProperties,
  panel: {
    border: "1px solid #fed7aa",
    borderRadius: "1rem",
    backgroundColor: "#ffffff",
    padding: "1.5rem",
  } satisfies CSSProperties,
  mutedText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.9rem",
  } satisfies CSSProperties,
} as const;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

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
  owner?: {
    user_wallets?: Array<{ wallet_address: string }> | null;
  } | null;
};

function resolveOwnerWallet(apartment: ApartmentData): string | null {
  const wallet = apartment.owner?.user_wallets?.[0]?.wallet_address;
  if (wallet && STELLAR_ADDRESS_RE.test(wallet)) {
    return wallet;
  }
  return null;
}

export default function EscrowCreatePage({
  params,
}: {
  params: { id: string };
}) {
  if (!UUID_RE.test(params.id)) {
    notFound();
  }

  const { data, loading, error } = useQuery<{ apartments: ApartmentData[] }>(
    GET_APARTMENT_BY_ID,
    { variables: { id: params.id } }
  );

  const apartment = data?.apartments[0] ?? null;
  const ownerWallet = apartment ? resolveOwnerWallet(apartment) : null;

  return (
    <div style={styles.page}>
      <EscrowDetailLayout invoiceNumber="INV4257-09-012" status="pending">
        <div style={{ ...styles.panel, display: "grid", gap: "1rem" }}>
          {loading && (
            <p style={styles.mutedText}>Loading property details…</p>
          )}

          {error && (
            <p style={{ margin: 0, color: "#b91c1c", fontSize: "0.9rem" }}>
              Failed to load property details.
            </p>
          )}

          {apartment && (
            <ApartmentPropertyCard
              name={apartment.name}
              imageUrls={apartment.image_urls}
              address={apartment.address}
              description={apartment.description}
              paySlot={
                ownerWallet ? (
                  <EscrowPayFlow
                    apartmentId={params.id}
                    apartmentName={apartment.name}
                    ownerAddress={ownerWallet}
                    amount={apartment.price}
                  />
                ) : (
                  <p style={styles.mutedText}>
                    Owner wallet is not available yet. Payment is disabled until
                    the owner&apos;s Stellar wallet is linked.
                  </p>
                )
              }
            />
          )}

          {!loading && !error && !apartment && (
            <p style={styles.mutedText}>Property not found.</p>
          )}
        </div>
      </EscrowDetailLayout>
    </div>
  );
}
