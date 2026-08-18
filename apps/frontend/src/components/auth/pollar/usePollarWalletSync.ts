"use client";

import { useEffect } from "react";
import { usePollar } from "@pollar/react";
import { useGlobalAuthenticationStore } from "@/core/store/data";

// Syncs the Pollar-provisioned Stellar G-address to public.user_wallets via
// POST /api/auth/activate-wallet in apps/api, and mirrors it into the
// existing wallet auth store so route guards (e.g. Login.tsx) redirect the
// same way they do for Freighter/MetaMask connections.
export function usePollarWalletSync() {
  const { isAuthenticated, wallet } = usePollar();
  const connectWalletStore = useGlobalAuthenticationStore(
    (state) => state.connectWalletStore,
  );

  useEffect(() => {
    if (!isAuthenticated || !wallet?.address) return;

    connectWalletStore(wallet.address, "pollar");

    const syncWallet = async () => {
      try {
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3002";

        await fetch(`${backendUrl}/api/auth/activate-wallet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: wallet.address,
            chainType: "STELLAR",
            isPrimary: true,
            provider: "pollar",
          }),
        });

        console.log("[pollar] wallet synced to user_wallets:", wallet.address);
      } catch (error) {
        console.error("[pollar] wallet sync failed:", error);
      }
    };

    syncWallet();
  }, [isAuthenticated, wallet?.address, connectWalletStore]);
}
