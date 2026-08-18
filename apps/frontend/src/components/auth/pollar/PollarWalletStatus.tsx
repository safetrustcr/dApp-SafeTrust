"use client";

import { Wallet } from "lucide-react";
import { usePollar } from "@pollar/react";
import { usePollarWallet } from "./PollarProvider";

export function PollarWalletStatus() {
  const { configured } = usePollarWallet();
  if (!configured) {
    return null;
  }

  return <PollarWalletStatusInner />;
}

function PollarWalletStatusInner() {
  const { isAuthenticated, wallet } = usePollar();

  if (!isAuthenticated || !wallet?.address) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2">
      <Wallet size={14} className="text-orange-500" strokeWidth={2.2} />
      <div>
        <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
          Stellar wallet
        </p>
        <p className="font-mono text-sm font-semibold text-amber-900">
          {wallet.address.slice(0, 8)}…{wallet.address.slice(-6)}
        </p>
      </div>
    </div>
  );
}
