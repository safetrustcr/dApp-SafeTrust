"use client";

import { cn } from "@/lib/utils";

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

  const truncated = address.slice(0, 4) + "..." + address.slice(-4);

  return (
    <span
      className={cn("font-mono text-xs text-muted-foreground", className)}
      title={address}
    >
      {truncated}
    </span>
  );
}
