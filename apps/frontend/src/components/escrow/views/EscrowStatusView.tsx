"use client";

import { PdfExportButton } from "@/components/escrow/PdfExportButton";
import type { EscrowDetail } from "@/types/escrow";
import {
  InfoPair,
  depositAmount,
  formatDate,
  formatMoney,
  formatOwnerName,
  formatWallet,
  ownerWalletAddress,
  viewStyles,
} from "./escrow-view-utils";

// funded (acknowledged) / active → deposit is blocked in the contract.
// Shows tenant and owner panels plus the escrow description.

export function EscrowStatusView({ escrow }: { escrow: EscrowDetail }) {
  const apartment = escrow.apartment;
  const owner = apartment?.owner;

  return (
    <div style={viewStyles.stack}>
      <div style={viewStyles.splitGrid}>
        <InfoPair label="Creation date" value={formatDate(escrow.created_at)} />
        <InfoPair label="Amount blocked" value={formatMoney(depositAmount(escrow))} />
      </div>

      <div>
        <div style={viewStyles.sectionHeadingRow}>
          <h3 style={{ margin: 0 }}>Escrow description</h3>
          <PdfExportButton />
        </div>
        {/* Read-only: mirrors the apartment listing description. Editable
            free-text lives in the NotesPanel, which persists changes. */}
        <p style={viewStyles.readonlyText}>
          {apartment?.description || "No description provided."}
        </p>
      </div>

      <div style={{ ...viewStyles.columns, ...viewStyles.divider }}>
        <div>
          <h3 style={{ marginTop: 0 }}>Tenant information</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <InfoPair label="Wallet address" value={formatWallet(escrow.sender_address)} />
            <InfoPair label="Amount" value={formatMoney(escrow.amount)} />
          </div>
        </div>
        <div>
          <h3 style={{ marginTop: 0 }}>Owner information</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <InfoPair label="Owner name" value={formatOwnerName(owner)} />
            <InfoPair
              label="Wallet address"
              value={formatWallet(escrow.receiver_address ?? ownerWalletAddress(owner))}
            />
            <InfoPair label="Email" value={owner?.email ?? "—"} />
          </div>
        </div>
      </div>
    </div>
  );
}
