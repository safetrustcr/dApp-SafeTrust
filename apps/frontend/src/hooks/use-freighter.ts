// apps/frontend/src/hooks/use-freighter.ts
// Thin wrapper — exposes Freighter wallet state for useActiveWallet.
// Full Freighter connect logic lives in auth/wallet/hooks/wallet.hook.ts.
// This hook provides the shape useActiveWallet expects.

import { useState, useEffect } from 'react';

export type FreighterWallet = {
  address: string | null;
  signAndSubmit: ((xdr: string) => Promise<void>) | null;
};

/**
 * useFreighter — returns the connected Freighter public key if available.
 * Reads from window.freighterApi (injected by the Freighter browser extension).
 * Returns null address when Freighter is not installed or not connected.
 */
export function useFreighter(): FreighterWallet {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      try {
        // @ts-expect-error — window.freighterApi is injected by the extension
        const api = window.freighterApi;
        if (!api) return;
        const connected = await api.isConnected();
        if (!connected || cancelled) return;
        const { publicKey } = await api.getPublicKey();
        if (!cancelled) setAddress(publicKey ?? null);
      } catch {
        // Freighter not available — stay null
      }
    }

    void detect();
    return () => { cancelled = true; };
  }, []);

  const signAndSubmit = address
    ? async (xdr: string): Promise<void> => {
        try {
          // @ts-expect-error — window.freighterApi
          const api = window.freighterApi;
          const { signedTransaction } = await api.signTransaction(xdr, {
            networkPassphrase: process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'Test SDF Network ; September 2015',
          });
          // Submit is handled by the frontend send-transaction route
          const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
          await fetch(`${baseUrl}/api/escrow/send-transaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signedXDR: signedTransaction }),
          });
        } catch (err) {
          throw new Error(`Freighter signing failed: ${String(err)}`);
        }
      }
    : null;

  return { address, signAndSubmit };
}