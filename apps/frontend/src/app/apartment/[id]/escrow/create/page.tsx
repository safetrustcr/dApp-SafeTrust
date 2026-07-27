"use client";

import { useQuery } from "@apollo/client";
import { notFound } from "next/navigation";
import { Mail, Phone, Wallet } from "lucide-react";
import type { CSSProperties } from "react";

import { ApartmentPropertyCard } from "@/components/escrow/ApartmentPropertyCard";
import { EscrowDetailLayout } from "@/components/escrow/EscrowDetailLayout";
import { EscrowPayFlow } from "@/components/escrow/EscrowPayFlow";
import { GET_APARTMENT_BY_ID } from "@/graphql/queries/apartment-queries";

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  page: {
    maxWidth: "72rem",
    margin: "0 auto",
    padding: "2rem 1.5rem 3rem",
    color: "#111827",
  } satisfies CSSProperties,

  card: {
    border: "1px solid #fed7aa",
    borderRadius: "1rem",
    backgroundColor: "#ffffff",
    overflow: "hidden",
  } satisfies CSSProperties,

  amountBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff7ed",
    borderTop: "1px solid #fed7aa",
    padding: "1rem 1.5rem",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
  } satisfies CSSProperties,

  amountLabel: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#92400e",
    fontWeight: 500,
  } satisfies CSSProperties,

  amountValue: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: 800,
    color: "#f97316",
  } satisfies CSSProperties,

  amountUnit: {
    fontSize: "0.8rem",
    fontWeight: 500,
    color: "#92400e",
  } satisfies CSSProperties,

  ownerSection: {
    borderTop: "1px solid #fed7aa",
    padding: "1.5rem",
    display: "grid",
    gap: "1.25rem",
  } satisfies CSSProperties,

  ownerHeading: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
    color: "#111827",
  } satisfies CSSProperties,

  ownerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))",
    gap: "1rem",
  } satisfies CSSProperties,

  ownerRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.65rem",
  } satisfies CSSProperties,

  ownerIconWrap: {
    width: "2rem",
    height: "2rem",
    borderRadius: "9999px",
    backgroundColor: "#fff7ed",
    border: "1px solid #fed7aa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: "0.1rem",
  } satisfies CSSProperties,

  ownerLabel: {
    margin: 0,
    fontSize: "0.75rem",
    color: "#9ca3af",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  } satisfies CSSProperties,

  ownerValue: {
    margin: "0.2rem 0 0",
    fontWeight: 600,
    color: "#111827",
    fontSize: "0.9rem",
    wordBreak: "break-word" as const,
  } satisfies CSSProperties,

  walletDisabled: {
    margin: 0,
    color: "#92400e",
    fontSize: "0.85rem",
    backgroundColor: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: "0.75rem",
    padding: "0.75rem 1rem",
    lineHeight: 1.5,
  } satisfies CSSProperties,

  mutedText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.9rem",
  } satisfies CSSProperties,

  errorText: {
    margin: 0,
    color: "#b91c1c",
    fontSize: "0.9rem",
  } satisfies CSSProperties,
} as const;

// ── Regex ──────────────────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

// ── Types ──────────────────────────────────────────────────────────────────

type ApartmentOwner = {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  country_code?: string | null;
  user_wallets?: Array<{ wallet_address: string }> | null;
};

// Replace the ApartmentData type
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
  warranty_deposit?: number | null;
  pet_friendly?: boolean | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  owner_id: string;
  owner?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    country_code?: string | null;
    user_wallets?: Array<{ wallet_address: string }> | null;
  } | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveOwnerWallet(apartment: ApartmentData): string | null {
  const wallet = apartment.owner?.user_wallets?.[0]?.wallet_address;
  if (wallet && STELLAR_ADDRESS_RE.test(wallet)) {
    return wallet;
  }
  return null;
}

function formatWallet(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}

function formatOwnerName(owner: ApartmentOwner | null | undefined): string {
  if (!owner) return "—";
  return [owner.first_name, owner.last_name].filter(Boolean).join(" ") || "—";
}

function formatPhone(owner: ApartmentOwner | null | undefined): string {
  if (!owner?.phone_number) return "";
  return [owner.country_code, owner.phone_number].filter(Boolean).join(" ");
}

// ── Sub-components ─────────────────────────────────────────────────────────

function OwnerContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div style={styles.ownerRow}>
      <div style={styles.ownerIconWrap}>
        <Icon size={14} color="#f97316" strokeWidth={2.2} />
      </div>
      <div>
        <p style={styles.ownerLabel}>{label}</p>
        <p style={styles.ownerValue}>{value}</p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

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
  const owner = apartment?.owner ?? null;
  const depositAmount = apartment?.warranty_deposit ?? apartment?.price ?? 0;

  return (
    <div style={styles.page}>
      <EscrowDetailLayout invoiceNumber="INV4257-09-012" status="pending">

        {/* ── Loading ───────────────────────────────────────────────────── */}
        {loading && (
          <div style={styles.card}>
            <div style={{ padding: "1.5rem" }}>
              <p style={styles.mutedText}>Loading property details…</p>
            </div>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {error && !loading && (
          <div style={styles.card}>
            <div style={{ padding: "1.5rem" }}>
              <p style={styles.errorText}>
                Failed to load property details. Please try again.
              </p>
            </div>
          </div>
        )}

        {/* ── Not found ─────────────────────────────────────────────────── */}
        {!loading && !error && !apartment && (
          <div style={styles.card}>
            <div style={{ padding: "1.5rem" }}>
              <p style={styles.mutedText}>Property not found.</p>
            </div>
          </div>
        )}

        {/* ── Main content ──────────────────────────────────────────────── */}
        {apartment && (
          <div style={styles.card}>

            {/* Apartment card + PAY button */}
            <ApartmentPropertyCard
            name={apartment.name}
            imageUrls={apartment.image_urls}
            address={apartment.address}
            description={apartment.description}
            petFriendly={apartment.pet_friendly ?? false}
            bedrooms={apartment.bedrooms}
            bathrooms={apartment.bathrooms}
            paySlot={
              ownerWallet ? (
                <EscrowPayFlow
                  apartmentId={params.id}
                  apartmentName={apartment.name}
                  ownerWalletAddress={ownerWallet}
                  amount={apartment.price}
                />
              ) : (
                <p style={styles.walletDisabled}>
                  Owner wallet is not available yet. Payment is disabled until
                  the owner&apos;s Stellar wallet is linked.
                </p>
              )
            }
          />

            {/* Security deposit amount banner */}
            <div style={styles.amountBanner}>
              <p style={styles.amountLabel}>Security deposit due</p>
              <p style={styles.amountValue}>
                ${depositAmount.toLocaleString("en-US")}{" "}
                <span style={styles.amountUnit}>USDC</span>
              </p>
            </div>

            {/* Owner contact section */}
            {owner && (
              <div style={styles.ownerSection}>
                <h3 style={styles.ownerHeading}>Owner contact</h3>
                <div style={styles.ownerGrid}>
                  {formatOwnerName(owner) !== "—" && (
                    <OwnerContactRow
                      icon={Wallet}
                      label="Owner"
                      value={formatOwnerName(owner)}
                    />
                  )}
                  {owner.email && (
                    <OwnerContactRow
                      icon={Mail}
                      label="Email"
                      value={owner.email}
                    />
                  )}
                  {formatPhone(owner) && (
                    <OwnerContactRow
                      icon={Phone}
                      label="Phone"
                      value={formatPhone(owner)}
                    />
                  )}
                  {ownerWallet && (
                    <OwnerContactRow
                      icon={Wallet}
                      label="Stellar wallet"
                      value={formatWallet(ownerWallet)}
                    />
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </EscrowDetailLayout>
    </div>
  );
}