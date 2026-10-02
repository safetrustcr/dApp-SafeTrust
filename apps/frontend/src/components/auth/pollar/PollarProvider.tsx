"use client";

import { createContext, useContext, type ReactNode } from "react";
import { PollarProvider as SdkPollarProvider, usePollar } from "@pollar/react";
import type { SignAndSubmit } from "@/hooks/use-active-wallet";

export type PollarWalletValue = {
  address: string | null;
  signAndSubmit: SignAndSubmit | null;
  configured: boolean;
};

export const PollarWalletContext = createContext<PollarWalletValue>({
  address: null,
  signAndSubmit: null,
  configured: false,
});

function PollarAddressBridge({ children }: { children: ReactNode }) {
  const { wallet, signAndSubmitTx } = usePollar();

  const signAndSubmit: SignAndSubmit = async (unsignedXdr) => {
    const result = await signAndSubmitTx(unsignedXdr);
    if (result.status === 'error') {
      throw new Error(result.message ?? result.details ?? 'Pollar transaction submission failed.');
    }
  };

  return (
    <PollarWalletContext.Provider
      value={{ address: wallet?.address ?? null, signAndSubmit, configured: true }}
    >
      {children}
    </PollarWalletContext.Provider>
  );
}

/**
 * Thin wrapper around the official Pollar SDK provider.
 * If the publishable key is missing the app still renders (CI / local without keys).
 */
export function PollarProvider({ children }: { children: ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY;

  if (!apiKey) {
    return (
      <PollarWalletContext.Provider value={{ address: null, signAndSubmit: null, configured: false }}>
        {children}
      </PollarWalletContext.Provider>
    );
  }

  return (
    <SdkPollarProvider client={{ apiKey }}>
      <PollarAddressBridge>{children}</PollarAddressBridge>
    </SdkPollarProvider>
  );
}

export function usePollarWallet(): PollarWalletValue {
  return useContext(PollarWalletContext);
}
