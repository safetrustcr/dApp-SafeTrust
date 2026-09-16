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
  depositBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff7ed",
    borderTop: "1px solid #fed7aa",
    padding: "0.875rem 1.5rem",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
  } satisfies CSSProperties,
  depositLabel: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#92400e",
    fontWeight: 500,
  } satisfies CSSProperties,
  depositValue: {
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: 800,
    color: "#f97316",
  } satisfies CSSProperties,
  depositUnit: {
    fontSize: "0.75rem",
    fontWeight: 500,
    color: "#92400e",
    marginLeft: "0.25rem",
  } satisfies CSSProperties,
  ownerSection: {
    borderTop: "1px solid #fed7aa",
    padding: "1.25rem 1.5rem",
    display: "grid",
    gap: "1rem",
  } satisfies CSSProperties,
  ownerHeading: {
    margin: 0,
    fontSize: "0.95rem",
    fontWeight: 700,
    color: "#111827",
  } satisfies CSSProperties,
  ownerPills: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.75rem",
  } satisfies CSSProperties,
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    padding: "0.35rem 0.75rem",
    borderRadius: "9999px",
    backgroundColor: "#fff7ed",
    border: "1px solid #fed7aa",
    fontSize: "0.85rem",
    fontWeight: 500,
    color: "#92400e",
    whiteSpace: "nowrap" as const,
  } satisfies CSSProperties,
  noData: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.875rem",
    padding: "1.5rem",
  } satisfies CSSProperties,
} as const;

function ContactPill({ icon: Icon, value }: { icon: typeof Mail; value: string }) {
  return (
    <span style={styles.pill}>
      <Icon size={13} color="#f97316" strokeWidth={2.2} aria-hidden />
      {value}
    </span>
  );
}

// Accept EscrowDetail | undefined — the page may not have data yet
export function EscrowPendingView({ escrow }: { escrow?: EscrowDetail }) {
  const apartment = escrow?.apartment;
  const owner = apartment?.owner;
  const ownerAddr = escrow?.receiver_address ?? ownerWalletAddress(owner) ?? "";
  const depositDue = apartment?.warranty_deposit ?? escrow?.amount;
  const hasPhone = Boolean(owner?.phone_number || owner?.country_code);

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div style={styles.card}>
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
                ownerAddress={ownerAddr}
                amount={escrow?.amount ?? 0}
              />
            }
          />
        ) : (
          <p style={styles.noData}>Property details unavailable.</p>
        )}

        {/* Security deposit banner */}
        <div style={styles.depositBanner}>
          <p style={styles.depositLabel}>Security deposit due</p>
          <p style={styles.depositValue}>
            {formatMoney(depositDue)}
            <span style={styles.depositUnit}>USDC</span>
          </p>
        </div>

        {/* Owner contact pills */}
        {owner && (
          <div style={styles.ownerSection}>
            <h3 style={styles.ownerHeading}>Owner contact</h3>
            <div style={styles.ownerPills}>
              {hasPhone && (
                <ContactPill icon={Phone} value={formatOwnerPhone(owner)} />
              )}
              {owner.email && (
                <ContactPill icon={Mail} value={owner.email} />
              )}
              {ownerAddr && (
                <ContactPill icon={Wallet} value={formatWallet(ownerAddr)} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}