// apps/frontend/src/hooks/use-freighter.ts
// Connection detection only; XDR signing belongs to WalletBridge.sign.
// Full Freighter connect logic lives in auth/wallet/hooks/wallet.hook.ts.

import { useState, useEffect } from 'react';

export type FreighterWallet = {
  address: string | null;
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

  return { address };
}
