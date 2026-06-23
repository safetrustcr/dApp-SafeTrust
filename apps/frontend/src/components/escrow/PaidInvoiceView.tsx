"use client";

import { useQuery } from "@apollo/client";
import type { CSSProperties, ReactNode } from "react";

import { GET_USER_BY_WALLET_ADDRESS } from "@/graphql/queries/user-queries";
import { truncateStellarAddress } from "@/lib/utils";

const FALLBACK_IMAGE = "/img/room1.png";

const TERMS_AND_CONDITIONS = `This rental agreement is governed by SafeTrust's escrow protocol on the Stellar network. The deposit is held in a smart contract and released to the property owner only upon mutual confirmation of move-out conditions. Tenants are responsible for property damage beyond normal wear and tear. Disputes are resolved through the SafeTrust arbitration process described in the platform terms of service.`;

type ApartmentInput = {
  id?: string;
  name?: string | null;
  image_urls?: string[] | null;
  price?: number | null;
  warranty_deposit?: number | null;
  available_until?: string | null;
};

type EscrowInput = {
  engagement_id?: string | null;
  contract_id?: string | null;
  id?: string;
  amount?: number | null;
  created_at?: string | null;
  sender_address?: string | null;
  apartment?: ApartmentInput | null;
};

type PaidInvoiceViewProps = {
  escrow: EscrowInput;
};

const styles = {
  container: {
    display: "grid",
    gap: "1.5rem",
  } satisfies CSSProperties,
  title: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#111827",
  } satisfies CSSProperties,
  divider: {
    border: "none",
    borderTop: "1px solid #e5e7eb",
    margin: 0,
  } satisfies CSSProperties,
  infoGrid: {
    display: "grid",
    gap: "2rem",
    gridTemplateColumns: "repeat(auto-fit, minmax(16rem, 1fr))",
  } satisfies CSSProperties,
  infoColumn: {
    display: "grid",
    gap: "0.9rem",
  } satisfies CSSProperties,
  infoRow: {
    display: "grid",
    gridTemplateColumns: "9rem 1fr",
    gap: "0.75rem",
    alignItems: "start",
  } satisfies CSSProperties,
  infoLabel: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.9rem",
  } satisfies CSSProperties,
  infoValue: {
    margin: 0,
    fontWeight: 700,
    color: "#111827",
    fontSize: "0.95rem",
  } satisfies CSSProperties,
  tableWrap: {
    borderRadius: "0.75rem",
    overflow: "hidden",
    border: "1px solid #e5e7eb",
  } satisfies CSSProperties,
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.95rem",
  } satisfies CSSProperties,
  th: {
    textAlign: "left" as const,
    padding: "0.85rem 1rem",
    color: "#6b7280",
    fontSize: "0.75rem",
    letterSpacing: "0.06em",
    backgroundColor: "#f9fafb",
    fontWeight: 700,
  } satisfies CSSProperties,
  thRight: {
    textAlign: "right" as const,
    padding: "0.85rem 1rem",
    color: "#6b7280",
    fontSize: "0.75rem",
    letterSpacing: "0.06em",
    backgroundColor: "#f9fafb",
    fontWeight: 700,
  } satisfies CSSProperties,
  td: {
    padding: "1rem",
    color: "#111827",
    fontWeight: 600,
  } satisfies CSSProperties,
  tdRight: {
    padding: "1rem",
    textAlign: "right" as const,
    color: "#111827",
    fontWeight: 700,
  } satisfies CSSProperties,
  productCell: {
    display: "flex",
    alignItems: "center",
    gap: "0.85rem",
  } satisfies CSSProperties,
  thumb: {
    width: "3rem",
    height: "3rem",
    objectFit: "cover" as const,
    borderRadius: "0.5rem",
    display: "block",
    flexShrink: 0,
  } satisfies CSSProperties,
  totalsGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "0.5rem 2rem",
    fontSize: "0.95rem",
  } satisfies CSSProperties,
  totalsRow: {
    display: "grid",
    gridTemplateColumns: "8rem 1fr",
    gap: "0.75rem",
    alignItems: "center",
  } satisfies CSSProperties,
  totalsLabel: {
    margin: 0,
    color: "#374151",
    fontWeight: 600,
  } satisfies CSSProperties,
  totalsValue: {
    margin: 0,
    color: "#111827",
    fontWeight: 700,
  } satisfies CSSProperties,
  termsTitle: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 700,
    color: "#111827",
  } satisfies CSSProperties,
  termsText: {
    margin: "0.5rem 0 0",
    color: "#6b7280",
    fontSize: "0.875rem",
    lineHeight: 1.55,
  } satisfies CSSProperties,
} as const;

function formatLongDate(value?: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatBatchMonth(value?: string | null): string {
  if (!value) return "Payment batch";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "Payment batch";
  return `Payment batch ${d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })}`;
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "-";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function computeDueDate(escrow: EscrowInput): string {
  const fromApartment = escrow.apartment?.available_until;
  if (fromApartment) return formatLongDate(fromApartment);
  if (escrow.created_at) {
    const d = new Date(escrow.created_at);
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + 30);
      return formatLongDate(d.toISOString());
    }
  }
  return "-";
}

function buildInvoiceNumber(escrow: EscrowInput): string {
  const raw = escrow.engagement_id || escrow.contract_id || escrow.id || "";
  if (!raw) return "-";
  if (raw.startsWith("INV")) return raw;
  return `INV-${raw.slice(0, 12)}`;
}

function buildTenantName(
  firstName?: string | null,
  lastName?: string | null,
  fallbackAddress?: string | null,
): string {
  const combined = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (combined) return combined;
  if (fallbackAddress) return truncateStellarAddress(fallbackAddress);
  return "-";
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={styles.infoRow}>
      <p style={styles.infoLabel}>{label}</p>
      <p style={styles.infoValue}>{value}</p>
    </div>
  );
}

export function PaidInvoiceView({ escrow }: PaidInvoiceViewProps) {
  const senderAddress = escrow.sender_address ?? "";

  const { data: userData } = useQuery(GET_USER_BY_WALLET_ADDRESS, {
    variables: { wallet_address: senderAddress },
    skip: !senderAddress,
  });

  const tenant = userData?.users?.[0];
  const tenantName = buildTenantName(tenant?.first_name, tenant?.last_name, senderAddress);
  const billedTo =
    tenant?.email ??
    (senderAddress ? truncateStellarAddress(senderAddress) : "-");

  const apartmentName = escrow.apartment?.name ?? "-";
  const apartmentThumb =
    escrow.apartment?.image_urls?.[0] ?? FALLBACK_IMAGE;
  const monthlyPrice = escrow.apartment?.price ?? null;
  const deposit =
    escrow.apartment?.warranty_deposit ?? escrow.amount ?? null;

  const subtotal = monthlyPrice ?? 0;
  const total = (monthlyPrice ?? 0) + (deposit ?? 0);

  const invoiceNumber = buildInvoiceNumber(escrow);
  const issued = formatLongDate(escrow.created_at);
  const dueDate = computeDueDate(escrow);
  const title = formatBatchMonth(escrow.created_at);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{title}</h2>
      <hr style={styles.divider} />

      <div style={styles.infoGrid}>
        <div style={styles.infoColumn}>
          <InfoRow label="Billed to" value={billedTo} />
          <InfoRow label="Billing details" value={tenantName} />
        </div>
        <div style={styles.infoColumn}>
          <InfoRow label="Invoice Number" value={invoiceNumber} />
          <InfoRow label="Subject" value="Rent service" />
          <InfoRow label="Currency" value="USDC - Dollar" />
          <InfoRow label="Issued" value={issued} />
          <InfoRow label="Due date" value={dueDate} />
          <InfoRow label="Notes" value="-" />
        </div>
      </div>

      <hr style={styles.divider} />

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>PRODUCT</th>
              <th style={styles.thRight}>PRICE PER MONTH</th>
              <th style={styles.thRight}>DEPOSIT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>
                <div style={styles.productCell}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={apartmentThumb}
                    alt={apartmentName}
                    style={styles.thumb}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.onerror = null;
                      img.src = FALLBACK_IMAGE;
                    }}
                  />
                  <span>{apartmentName}</span>
                </div>
              </td>
              <td style={styles.tdRight}>{formatCurrency(monthlyPrice)}</td>
              <td style={styles.tdRight}>{formatCurrency(deposit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <hr style={styles.divider} />

      <div style={styles.totalsGrid}>
        <div style={styles.totalsRow}>
          <p style={styles.totalsLabel}>Subtotal</p>
          <p style={styles.totalsValue}>{formatCurrency(subtotal)}</p>
        </div>
        <div style={styles.totalsRow}>
          <p style={styles.totalsLabel}>Total</p>
          <p style={styles.totalsValue}>{formatCurrency(total)}</p>
        </div>
        <div style={styles.totalsRow}>
          <p style={styles.totalsLabel}>Discount (10%)</p>
          <p style={styles.totalsValue}>-</p>
        </div>
      </div>

      <hr style={styles.divider} />

      <div>
        <h3 style={styles.termsTitle}>Terms &amp; Condition</h3>
        <p style={styles.termsText}>{TERMS_AND_CONDITIONS}</p>
      </div>
    </div>
  );
}
