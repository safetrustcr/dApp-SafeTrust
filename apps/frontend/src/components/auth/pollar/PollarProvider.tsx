"use client";

import { createContext, useContext, type ReactNode } from "react";
import { PollarProvider as SdkPollarProvider, usePollar } from "@pollar/react";

type PollarWalletValue = {
  address?: string;
  configured: boolean;
};

const PollarWalletContext = createContext<PollarWalletValue>({
  configured: false,
});

function PollarAddressBridge({ children }: { children: ReactNode }) {
  const { wallet } = usePollar();

  return (
    <PollarWalletContext.Provider
      value={{ address: wallet?.address, configured: true }}
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
      <PollarWalletContext.Provider value={{ configured: false }}>
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
