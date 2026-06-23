// Shared formatters and inline styles for the escrow detail sub-views.
// Kept consistent with the orange/#fed7aa theme used by InvoiceHeader,
// ProcessStepper and ApartmentPropertyCard.

import type { CSSProperties } from "react";
import type { EscrowApartmentOwner, EscrowDetail } from "@/types/escrow";

export const viewStyles = {
  stack: {
    display: "grid",
    gap: "1.5rem",
  } satisfies CSSProperties,
  splitGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))",
  } satisfies CSSProperties,
  columns: {
    display: "grid",
    gap: "1.5rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
  } satisfies CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.95rem",
  } satisfies CSSProperties,
  tableWrap: {
    border: "1px solid #fed7aa",
    borderRadius: "1rem",
    overflow: "hidden",
  } satisfies CSSProperties,
  th: {
    textAlign: "left",
    padding: "0.9rem",
  } satisfies CSSProperties,
  thRight: {
    textAlign: "right",
    padding: "0.9rem",
  } satisfies CSSProperties,
  td: {
    padding: "0.9rem",
    borderTop: "1px solid #fed7aa",
  } satisfies CSSProperties,
  tdRight: {
    padding: "0.9rem",
    textAlign: "right",
    borderTop: "1px solid #fed7aa",
  } satisfies CSSProperties,
  thead: {
    backgroundColor: "#fff7ed",
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
  readonlyText: {
    margin: 0,
    border: "1px solid #e5e7eb",
    borderRadius: "0.75rem",
    padding: "0.75rem",
    minHeight: "6rem",
    backgroundColor: "#f9fafb",
    color: "#374151",
    whiteSpace: "pre-wrap",
  } satisfies CSSProperties,
  sectionHeadingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    marginBottom: "0.75rem",
    flexWrap: "wrap",
  } satisfies CSSProperties,
  divider: {
    borderTop: "1px solid #fed7aa",
    paddingTop: "1.5rem",
  } satisfies CSSProperties,
  buttonRow: {
    display: "flex",
    gap: "0.75rem",
    marginTop: "0.75rem",
    flexWrap: "wrap",
  } satisfies CSSProperties,
  secondaryButton: {
    border: "1px solid #d1d5db",
    backgroundColor: "#ffffff",
    color: "#111827",
    borderRadius: "0.75rem",
    padding: "0.6rem 1rem",
    fontWeight: 600,
    cursor: "pointer",
  } satisfies CSSProperties,
  primaryButton: {
    border: "1px solid #22c55e",
    backgroundColor: "#22c55e",
    color: "#ffffff",
    borderRadius: "0.75rem",
    padding: "0.6rem 1rem",
    fontWeight: 700,
    cursor: "pointer",
  } satisfies CSSProperties,
  mutedText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.9rem",
  } satisfies CSSProperties,
} as const;

export function InfoPair({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p style={{ margin: 0, color: "#6b7280", fontSize: "0.85rem" }}>{label}</p>
      <p style={{ margin: "0.35rem 0 0", fontWeight: 600, wordBreak: "break-word" }}>
        {value}
      </p>
    </div>
  );
}

export function formatMoney(amount: number | null | undefined): string {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "$0";
  return `$${value.toLocaleString("en-US")}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatWallet(address: string | null | undefined): string {
  if (!address) return "—";
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function formatOwnerName(owner: EscrowApartmentOwner | null | undefined): string {
  if (!owner) return "—";
  const name = [owner.first_name, owner.last_name].filter(Boolean).join(" ");
  return name || "—";
}

export function formatOwnerPhone(owner: EscrowApartmentOwner | null | undefined): string {
  if (!owner?.phone_number) return "—";
  return [owner.country_code, owner.phone_number].filter(Boolean).join(" ");
}

// Owner's primary Stellar wallet address, or null when none is on file.
// Never falls back to owner.id, which is the Firebase UID, not a valid address.
export function ownerWalletAddress(
  owner: EscrowApartmentOwner | null | undefined
): string | null {
  return owner?.user_wallets?.[0]?.wallet_address ?? null;
}

// The deposit kept in the contract; falls back to the apartment's configured
// warranty deposit, then to the escrow amount.
export function depositAmount(escrow: EscrowDetail): number {
  return Number(
    escrow.apartment?.warranty_deposit ?? escrow.amount ?? 0
  );
}

// Human-friendly invoice identifier derived from on-chain references.
export function invoiceNumber(escrow: EscrowDetail): string {
  const ref = escrow.engagement_id ?? escrow.contract_id ?? escrow.id;
  return ref.length > 18 ? `INV-${ref.slice(0, 14)}` : `INV-${ref}`;
}
