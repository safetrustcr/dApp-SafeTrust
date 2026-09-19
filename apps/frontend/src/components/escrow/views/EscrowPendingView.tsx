"use client";

import type { CSSProperties } from "react";
import { Mail, Phone, Wallet } from "lucide-react";
import { ApartmentPropertyCard } from "@/components/escrow/ApartmentPropertyCard";
import { EscrowPayFlow } from "@/components/escrow/EscrowPayFlow";
import type { EscrowDetail } from "@/types/escrow";
import {
  formatMoney,
  formatOwnerPhone,
  formatWallet,
  ownerWalletAddress,
} from "./escrow-view-utils";

const styles = {
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

  mutedText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.9rem",
    padding: "1.5rem",
  } satisfies CSSProperties,
} as const;

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

// pending_signature → tenant still has to fund the escrow.
// Shows the apartment card, PAY flow, deposit amount, and owner contact.
export function EscrowPendingView({ escrow }: { escrow: EscrowDetail }) {
  const apartment = escrow.apartment;
  const owner = apartment?.owner;

  // Stellar address the deposit is released to: the escrow's stored receiver
  // once deployed, otherwise the owner's primary wallet. Never owner.id.
  const ownerAddress =
    escrow.receiver_address ?? ownerWalletAddress(owner) ?? "";

  const depositDue = apartment?.warranty_deposit ?? escrow.amount;

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div style={styles.card}>

        {/* ── Apartment property card + PAY button ─────────────────────── */}
        {apartment ? (
          <ApartmentPropertyCard
            name={apartment.name}
            imageUrls={apartment.image_urls}
            address={apartment.address}
            description={apartment.description}
            paySlot={
              <EscrowPayFlow
                apartmentId={apartment.id}
                apartmentName={apartment.name}
                ownerAddress={ownerAddress}
                amount={escrow.amount}
              />
            }
          />
        ) : (
          <p style={styles.mutedText}>Property details unavailable.</p>
        )}

        {/* ── Security deposit amount banner ───────────────────────────── */}
        <div style={styles.amountBanner}>
          <p style={styles.amountLabel}>Security deposit due</p>
          <p style={styles.amountValue}>
            {formatMoney(depositDue)}{" "}
            <span style={styles.amountUnit}>USDC</span>
          </p>
        </div>

        {/* ── Owner contact ─────────────────────────────────────────────── */}
        {owner && (
          <div style={styles.ownerSection}>
            <h3 style={styles.ownerHeading}>Owner contact</h3>
            <div style={styles.ownerGrid}>
              {owner.email && (
                <OwnerContactRow
                  icon={Mail}
                  label="Email"
                  value={owner.email}
                />
              )}
              {(owner.phone_number || owner.country_code) && (
                <OwnerContactRow
                  icon={Phone}
                  label="Phone"
                  value={formatOwnerPhone(owner)}
                />
              )}
              {ownerAddress && (
                <OwnerContactRow
                  icon={Wallet}
                  label="Stellar wallet"
                  value={formatWallet(ownerAddress)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}