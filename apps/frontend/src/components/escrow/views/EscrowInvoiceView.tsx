"use client";

import type { EscrowDetail } from "@/types/escrow";
import {
  InfoPair,
  depositAmount,
  formatMoney,
  formatOwnerName,
  formatWallet,
  invoiceNumber,
  viewStyles,
} from "./escrow-view-utils";

// funded / active (before acknowledgement) → billing summary with the
// product line. Acknowledging moves the escrow to the status view.

export function EscrowInvoiceView({
  escrow,
  onAcknowledge,
}: {
  escrow: EscrowDetail;
  onAcknowledge?: () => void;
}) {
  const apartment = escrow.apartment;
  const owner = apartment?.owner;
  const monthlyPrice = Number(apartment?.price ?? escrow.amount);
  const deposit = depositAmount(escrow);
  const total = monthlyPrice + deposit;

  return (
    <div style={viewStyles.stack}>
      <div style={viewStyles.splitGrid}>
        <InfoPair label="Billed to" value={owner?.email ?? formatWallet(escrow.sender_address)} />
        <InfoPair label="Invoice number" value={invoiceNumber(escrow)} />
        <InfoPair label="Billing details" value={formatOwnerName(owner)} />
        <InfoPair label="Currency" value="USDC" />
      </div>

      <div style={viewStyles.tableWrap}>
        <table style={viewStyles.table}>
          <thead style={viewStyles.thead}>
            <tr>
              <th style={viewStyles.th}>PRODUCT</th>
              <th style={viewStyles.thRight}>PRICE / MONTH</th>
              <th style={viewStyles.thRight}>DEPOSIT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={viewStyles.td}>{apartment?.name ?? "Apartment rental"}</td>
              <td style={viewStyles.tdRight}>{formatMoney(monthlyPrice)}</td>
              <td style={viewStyles.tdRight}>{formatMoney(deposit)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontSize: "1.05rem" }}>Total: {formatMoney(total)}</strong>
        {onAcknowledge && (
          <button type="button" style={viewStyles.primaryButton} onClick={onAcknowledge}>
            Acknowledge invoice
          </button>
        )}
      </div>
    </div>
  );
}
