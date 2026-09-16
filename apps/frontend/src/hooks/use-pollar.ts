// apps/frontend/src/hooks/use-pollar.ts
// Thin wrapper — exposes Pollar wallet state for useActiveWallet.
// Full Pollar integration lives in auth/pollar/PollarProvider.tsx.

import { useContext } from 'react';
import {
  PollarWalletContext,
  type PollarWalletValue,
} from '@/components/auth/pollar/PollarProvider';

export type PollarWallet = Pick<PollarWalletValue, 'address' | 'signAndSubmit'>;

/**
 * usePollar — returns the active Pollar embedded wallet if provisioned.
 * Must be called inside a component tree wrapped by PollarProvider.
 * Returns null address when no Pollar wallet has been activated.
 */
export function usePollar(): PollarWallet {
  const { address, signAndSubmit } = useContext(PollarWalletContext);
  return { address, signAndSubmit };
}
