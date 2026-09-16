// apps/frontend/src/hooks/use-pollar.ts
// Thin wrapper — exposes Pollar wallet state for useActiveWallet.
// Full Pollar integration lives in auth/pollar/PollarProvider.tsx.

import { useContext, createContext } from 'react';

export type PollarWallet = {
  address: string | null;
  signAndSubmit: ((xdr: string) => Promise<void>) | null;
};

// Internal context — PollarProvider populates this.
// If your PollarProvider already exports a context, import it instead.
const PollarWalletContext = createContext<PollarWallet>({
  address: null,
  signAndSubmit: null,
});

export { PollarWalletContext };

/**
 * usePollar — returns the active Pollar embedded wallet if provisioned.
 * Must be called inside a component tree wrapped by PollarProvider.
 * Returns null address when no Pollar wallet has been activated.
 */
export function usePollar(): PollarWallet {
  return useContext(PollarWalletContext);
}