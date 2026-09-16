// apps/frontend/src/hooks/use-active-wallet.ts
// Fix: react-hooks/rules-of-hooks — usePollar cannot be called inside a callback.
// Solution: call usePollar at the top level of the hook, not conditionally.

import { useCallback } from 'react';
import { useFreighter } from '@/hooks/use-freighter'; // adjust import if needed
import { usePollar } from '@/hooks/use-pollar';       // adjust import if needed

export type WalletType = 'freighter' | 'pollar' | null;

export type ActiveWallet = {
  address: string | null;
  walletType: WalletType;
  isReady: boolean;
  signAndSubmit: (unsignedXDR: string) => Promise<void>;
};

/**
 * Returns the active Stellar wallet — Freighter or Pollar — whichever is connected.
 * Freighter takes priority when both are available.
 *
 * FIX: usePollar is now called unconditionally at the top level (rules-of-hooks).
 * Previously it was called inside a conditional branch which violates the Rules of Hooks.
 */
export function useActiveWallet(): ActiveWallet {
  const freighter = useFreighter();
  // ✅ Called unconditionally at hook top level — not inside a callback or condition
  const pollar = usePollar();

  const isFreighterReady = Boolean(freighter?.address);
  const isPollarReady = Boolean(pollar?.address);

  const activeAddress = freighter?.address ?? pollar?.address ?? null;
  const activeWalletType: WalletType = isFreighterReady
    ? 'freighter'
    : isPollarReady
      ? 'pollar'
      : null;

  const signAndSubmit = useCallback(
    async (unsignedXDR: string): Promise<void> => {
      if (isFreighterReady && freighter?.signAndSubmit) {
        await freighter.signAndSubmit(unsignedXDR);
      } else if (isPollarReady && pollar?.signAndSubmit) {
        await pollar.signAndSubmit(unsignedXDR);
      } else {
        throw new Error('No wallet available to sign transaction');
      }
    },
    [isFreighterReady, isPollarReady, freighter, pollar],
  );

  return {
    address: activeAddress,
    walletType: activeWalletType,
    isReady: Boolean(activeAddress),
    signAndSubmit,
  };
}