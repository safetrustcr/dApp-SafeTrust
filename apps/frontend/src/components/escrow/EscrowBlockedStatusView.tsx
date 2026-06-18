"use client";

import type { CSSProperties } from "react";
import { PdfExportButton } from "@/components/escrow/PdfExportButton";

// Truncate a wallet address in the style MJE...XN32
function truncateAddress(address: string | null | undefined): string {
  if (!address) return "—";
  if (address.length <= 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const styles = {
  panel: {
    border: "1px solid #fed7aa",
    borderRadius: "1rem",
    backgroundColor: "#ffffff",
    padding: "1.5rem",
  } satisfies CSSProperties,
  descriptionGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))",
    marginBottom: "1.5rem",
  } satisfies CSSProperties,
  infoGrid: {
    display: "grid",
    gap: "1.5rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
    borderTop: "1px solid #fed7aa",
    paddingTop: "1.5rem",
  } satisfies CSSProperties,
  label: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.85rem",
  } satisfies CSSProperties,
  value: {
    margin: "0.35rem 0 0",
    fontWeight: 600,
  } satisfies CSSProperties,
  monoValue: {
    margin: "0.35rem 0 0",
    fontWeight: 600,
    fontFamily: "monospace",
    fontSize: "0.9rem",
  } satisfies CSSProperties,
  panelHeadingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    marginBottom: "1.25rem",
    flexWrap: "wrap",
  } satisfies CSSProperties,
} as const;

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p style={styles.label}>{label}</p>
      <p style={mono ? styles.monoValue : styles.value}>{value}</p>
    </div>
  );
}

export type EscrowBlockedData = {
  createdAt: string | null | undefined;
  amount: number | string | null | undefined;
  senderAddress: string | null | undefined;
  receiverAddress: string | null | undefined;
  tenant: {
    firstName: string | null | undefined;
    lastName: string | null | undefined;
    email: string | null | undefined;
  } | null;
  owner: {
    firstName: string | null | undefined;
    lastName: string | null | undefined;
    email: string | null | undefined;
  } | null;
};

export function EscrowBlockedStatusView({ data }: { data: EscrowBlockedData }) {
  const depositAmount = data.amount != null
    ? `$${Number(data.amount).toLocaleString()}`
    : "—";

  const tenantName = [data.tenant?.firstName, data.tenant?.lastName]
    .filter(Boolean)
    .join(" ") || "—";

  const ownerName = [data.owner?.firstName, data.owner?.lastName]
    .filter(Boolean)
    .join(" ") || "—";

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* Escrow Description */}
      <div>
        <div style={styles.panelHeadingRow}>
          <h3 style={{ margin: 0 }}>Escrow Description</h3>
          <PdfExportButton />
        </div>
        <div style={styles.descriptionGrid}>
          <InfoRow
            label="Creation date"
            value={formatDate(data.createdAt)}
          />
          <InfoRow
            label="Amount blocked"
            value={depositAmount}
          />
        </div>
      </div>

      {/* Tenant / Owner panels */}
      <div style={styles.infoGrid}>
        {/* Tenant Information */}
        <div>
          <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Tenant Information</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <InfoRow label="Tenant name" value={tenantName} />
            <InfoRow
              label="Wallet Address"
              value={truncateAddress(data.senderAddress)}
              mono
            />
            <InfoRow
              label="Email Address"
              value={data.tenant?.email ?? "—"}
            />
            <InfoRow
              label="Rental date"
              value={formatDate(data.createdAt)}
            />
            <InfoRow label="Deposit amount" value={depositAmount} />
          </div>
        </div>

        {/* Owner Information */}
        <div>
          <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Owner Information</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <InfoRow label="Owner name" value={ownerName} />
            <InfoRow
              label="Wallet Address"
              value={truncateAddress(data.receiverAddress)}
              mono
            />
            <InfoRow
              label="Email Address"
              value={data.owner?.email ?? "—"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
