// apps/frontend/src/hooks/use-active-wallet.ts
// Fix: react-hooks/rules-of-hooks — usePollar cannot be called inside a callback.
// Solution: call usePollar at the top level of the hook, not conditionally.

import { useCallback } from 'react';
import { useFreighter } from '@/hooks/use-freighter'; // adjust import if needed
import { usePollar } from '@/hooks/use-pollar';       // adjust import if needed

// ---------------------------------------------------------------------------
// E2E wallet provider (gated — never active in production builds)
// ---------------------------------------------------------------------------
//
// When NEXT_PUBLIC_E2E_WALLET=true the app reads the injected window.__e2eAddress
// and signs through window.__e2eSign, which is exposed by the Playwright process.
// The secret key lives only in the Playwright Node.js process and never enters
// the browser bundle.
//
// SAFETY: next.config.mjs must ensure that a production build (NODE_ENV=production,
// NEXT_PUBLIC_VERCEL_ENV=production) cannot be built with E2E_WALLET=true.
// See scripts/check-client-secrets.sh for the enforcement check.

const IS_E2E =
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_E2E_WALLET === 'true';

type E2EWindow = Window & {
  __e2eAddress?: string;
  __e2eSign?: (xdr: string) => string;
  __e2eLastSignedXDR?: string;
};

function useE2EWallet() {
  const win = typeof window !== 'undefined' ? (window as E2EWindow) : null;
  const address = win?.__e2eAddress ?? null;

  const signAndSubmit = useCallback(
    async (unsignedXDR: string): Promise<void> => {
      if (!win?.__e2eSign) {
        throw new Error('[e2e] window.__e2eSign is not installed — did you call wallet.install(page)?');
      }
      const signed = win.__e2eSign(unsignedXDR);
      // Store the last signed XDR so the idempotency test (step 9) can re-submit it.
      win.__e2eLastSignedXDR = signed;
      // Submit through the app's existing API route
      const res = await fetch('/api/escrow/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXDR: signed }),
      });
      if (!res.ok) {
        throw new Error(`[e2e] submit failed: ${res.status}`);
      }
    },
    [win],
  );

  return { address, signAndSubmit };
}

export type WalletType = 'freighter' | 'pollar' | null;

export type TransactionSubmission = {
  contractId: string;
  engagementId: string;
  senderAddress: string;
  receiverAddress: string;
  amount?: number;
  action?: 'initialize' | 'fund' | 'mark_milestone_completed' | 'approve_milestone' | 'release_funds' | 'dispute' | 'resolve_dispute';
  propertyId?: string;
  milestoneId?: string;
  approver?: string;
  releaseSigner?: string;
};

export type SignAndSubmit = (
  unsignedXDR: string,
  submission: TransactionSubmission,
) => Promise<void>;

export type ActiveWallet = {
  address: string | null;
  walletType: WalletType;
  isReady: boolean;
  signAndSubmit: SignAndSubmit;
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
  // ✅ E2E provider called unconditionally; IS_E2E gates whether it is actually used
  const e2e = useE2EWallet();

  const isFreighterReady = Boolean(freighter?.address);
  const isPollarReady = Boolean(pollar?.address);

  // ✅ useCallback must run before any early return (rules-of-hooks).
  const signAndSubmit = useCallback(
    async (unsignedXDR: string, submission: TransactionSubmission): Promise<void> => {
      if (isFreighterReady && freighter?.signAndSubmit) {
        await freighter.signAndSubmit(unsignedXDR, submission);
      } else if (isPollarReady && pollar?.signAndSubmit) {
        await pollar.signAndSubmit(unsignedXDR, submission);
      } else {
        throw new Error('No wallet available to sign transaction');
      }
    },
    [isFreighterReady, isPollarReady, freighter, pollar],
  );

  // Short-circuit to the e2e provider when the flag is set.
  // This path is only reachable in test environments — see IS_E2E guard above.
  if (IS_E2E) {
    return {
      address: e2e.address,
      walletType: 'freighter', // presented as 'freighter' so existing UI guards pass
      isReady: Boolean(e2e.address),
      signAndSubmit: e2e.signAndSubmit as SignAndSubmit,
    };
  }

  return {
    address: activeAddress,
    walletType: activeWalletType,
    isReady: Boolean(activeAddress),
    signAndSubmit,
  };
}
