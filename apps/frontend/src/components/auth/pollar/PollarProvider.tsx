"use client";

import { createContext, useContext, type ReactNode } from "react";
import { PollarProvider as SdkPollarProvider, usePollar } from "@pollar/react";
import type { SignAndSubmit } from "@/hooks/use-active-wallet";

export type PollarWalletValue = {
  address: string | null;
  provisioning: string | null;
  pollarAccessToken: string | null;
  signAndSubmit: SignAndSubmit | null;
  configured: boolean;
  login?: ReturnType<typeof usePollar>['login'];
};

export const PollarWalletContext = createContext<PollarWalletValue>({
  address: null,
  provisioning: null,
  pollarAccessToken: null,
  signAndSubmit: null,
  configured: false,
});

function PollarAddressBridge({ children }: { children: ReactNode }) {
  const { wallet, signAndSubmitTx, login, verified, getClient } = usePollar();
  const authState = getClient().getAuthState();
  const pollarAccessToken =
    verified && authState.step === 'authenticated'
      ? authState.session.token.accessToken
      : null;
  const provisioning =
    wallet && 'provisioning' in wallet && typeof wallet.provisioning === 'string'
      ? wallet.provisioning
      : null;

  const signAndSubmit: SignAndSubmit = async (unsignedXdr) => {
    const result = await signAndSubmitTx(unsignedXdr);
    if (result.status === 'error') {
      throw new Error(result.message ?? result.details ?? 'Pollar transaction submission failed.');
    }
  };

  return (
    <PollarWalletContext.Provider
      value={{
        address: wallet?.address ?? null,
        provisioning,
        pollarAccessToken,
        signAndSubmit,
        configured: true,
        login,
      }}
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
      <PollarWalletContext.Provider
        value={{
          address: null,
          provisioning: null,
          pollarAccessToken: null,
          signAndSubmit: null,
          configured: false,
        }}
      >
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
