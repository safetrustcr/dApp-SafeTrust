"use client";

import { useEffect, useRef } from "react";
import { usePollarWallet } from "./PollarProvider";
import { useGlobalAuthenticationStore } from "@/core/store/data";

/**
 * Syncs a Pollar G-address to public.user_wallets via POST /api/auth/activate-wallet.
 * Runs once per address when the guest already has a Firebase session.
 */
export function usePollarWalletSync() {
  const { address } = usePollarWallet();
  const token = useGlobalAuthenticationStore((state) => state.token);
  const syncedAddress = useRef<string | null>(null);

  useEffect(() => {
    if (!address || !token || syncedAddress.current === address) {
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3002";

    const syncWallet = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/auth/activate-wallet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          console.error("[pollar] wallet sync failed:", response.status);
          return;
        }

        syncedAddress.current = address;
      } catch (error) {
        console.error("[pollar] wallet sync failed:", error);
      }
    };

    void syncWallet();
  }, [address, token]);
}
