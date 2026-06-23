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

// completed / resolved → deposit released. Shows the justification, the
// beneficiary panel and a claims box.

export function EscrowReleasedView({ escrow }: { escrow: EscrowDetail }) {
  const owner = escrow.apartment?.owner;

  return (
    <div style={viewStyles.stack}>
      <div>
        <div style={viewStyles.sectionHeadingRow}>
          <h3 style={{ margin: 0 }}>Escrow justification</h3>
          <PdfExportButton />
        </div>
        <textarea style={viewStyles.input} placeholder="Justification…" />
      </div>

      <div style={viewStyles.columns}>
        <div>
          <h3 style={{ marginTop: 0 }}>Beneficiary information</h3>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <InfoPair label="Name" value={formatOwnerName(owner)} />
            <InfoPair
              label="Wallet"
              value={formatWallet(escrow.receiver_address ?? ownerWalletAddress(owner))}
            />
            <InfoPair
              label="Released date"
              value={formatDate(escrow.updated_at ?? escrow.created_at)}
            />
            <InfoPair label="Deposit" value={formatMoney(depositAmount(escrow))} />
          </div>
        </div>

        <div>
          <h3 style={{ marginTop: 0 }}>Claims</h3>
          <textarea
            style={{ ...viewStyles.input, minHeight: "5rem" }}
            placeholder="Claims…"
          />
          <div style={viewStyles.buttonRow}>
            <button type="button" style={viewStyles.secondaryButton}>
              Clean
            </button>
            <button type="button" style={viewStyles.primaryButton}>
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
