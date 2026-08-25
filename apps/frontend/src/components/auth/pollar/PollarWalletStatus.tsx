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
    <div className="flex items-center gap-2.5 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5 dark:border-orange-900 dark:bg-orange-950">
      <Wallet size={14} className="text-orange-500" strokeWidth={2.2} />
      <div>
        <p className="m-0 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
          Stellar wallet
        </p>
        <p className="m-0 font-mono text-[0.8rem] font-semibold text-orange-800 dark:text-orange-300">
          {wallet.address.slice(0, 8)}…{wallet.address.slice(-6)}
        </p>
      </div>
    </div>
  );
}
