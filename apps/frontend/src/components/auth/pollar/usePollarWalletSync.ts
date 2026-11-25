"use client";

import { useEffect, useRef } from "react";
import { usePollarWallet } from "./PollarProvider";
import { useGlobalAuthenticationStore } from "@/core/store/data";

/**
 * Syncs a provisioned Pollar G-address to public.user_wallets after verifying
 * the Firebase and Pollar sessions through POST /api/auth/activate-wallet.
 */
export function usePollarWalletSync() {
  const { address, provisioning, pollarAccessToken } = usePollarWallet();
  const token = useGlobalAuthenticationStore((state) => state.token);
  const syncedAddress = useRef<string | null>(null);

  useEffect(() => {
    if (
      !address ||
      provisioning !== "READY" ||
      !pollarAccessToken ||
      !token ||
      syncedAddress.current === address
    ) {
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
          body: JSON.stringify({ address, pollarAccessToken }),
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
  }, [address, pollarAccessToken, provisioning, token]);
}
