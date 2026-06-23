"use client";

import { cn, truncateStellarAddress } from "@/lib/utils";

interface WalletAddressTableProps {
  address?: string | null;
  className?: string;
}

export function WalletAddressTable({
  address,
  className,
}: WalletAddressTableProps) {
  if (!address) {
    return <span className="text-xs text-muted-foreground italic">No wallet</span>;
  }

  const truncated = truncateStellarAddress(address, 4, 4);

  return (
    <span
      className={cn("font-mono text-xs text-muted-foreground", className)}
      title={address}
    >
      {truncated}
    </span>
  );
}
