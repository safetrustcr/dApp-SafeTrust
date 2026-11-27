"use client";

import { useEffect, useRef } from "react";
import { usePollarWallet } from "./PollarProvider";
import { useAuthUser } from "@/components/auth/hooks/auth.hook";

/**
 * Syncs a Pollar G-address to public.user_wallets via POST /api/auth/activate-wallet.
 * Runs once per address when the guest has an active Firebase session, fetching
 * a fresh ID token directly from the live Firebase user.
 */
export function usePollarWalletSync() {
  const { address } = usePollarWallet();
  const { user } = useAuthUser();
  const syncedAddress = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      syncedAddress.current = null;
      return;
    }

    if (!address || syncedAddress.current === address) {
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3002";

    const syncWallet = async () => {
      try {
        const freshToken = await user.getIdToken();
        const response = await fetch(`${apiUrl}/api/auth/activate-wallet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${freshToken}`,
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
  }, [address, user]);
}
