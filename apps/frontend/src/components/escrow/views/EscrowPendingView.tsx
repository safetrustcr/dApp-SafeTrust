"use client";

import { ApartmentPropertyCard } from "@/components/escrow/ApartmentPropertyCard";
import { EscrowPayFlow } from "@/components/escrow/EscrowPayFlow";
import type { EscrowDetail } from "@/types/escrow";
import {
  InfoPair,
  formatMoney,
  formatOwnerName,
  formatOwnerPhone,
  formatWallet,
  ownerWalletAddress,
  viewStyles,
} from "./escrow-view-utils";

// pending_signature → tenant still has to fund the escrow. Shows the
// apartment, the PAY flow (deploy + sign) and the owner's contact details.

export function EscrowPendingView({ escrow }: { escrow: EscrowDetail }) {
  const apartment = escrow.apartment;
  const owner = apartment?.owner;
  // Stellar address the deposit is released to: the escrow's stored receiver
  // once deployed, otherwise the owner's primary wallet. Never owner.id.
  const ownerAddress =
    escrow.receiver_address ?? ownerWalletAddress(owner) ?? "";

  return (
    <div style={viewStyles.stack}>
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
        <p style={viewStyles.mutedText}>Property details unavailable.</p>
      )}

      <div style={viewStyles.divider}>
        <h3 style={{ marginTop: 0, marginBottom: "0.75rem", fontSize: "1rem" }}>
          Owner contact
        </h3>
        <div style={viewStyles.splitGrid}>
          <InfoPair label="Owner" value={formatOwnerName(owner)} />
          <InfoPair label="Email" value={owner?.email ?? "—"} />
          <InfoPair label="Phone" value={formatOwnerPhone(owner)} />
          <InfoPair label="Wallet" value={formatWallet(ownerAddress)} />
          <InfoPair label="Amount due" value={formatMoney(escrow.amount)} />
        </div>
      </div>
    </div>
  );
}
