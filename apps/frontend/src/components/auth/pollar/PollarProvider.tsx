"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { PollarProvider as SdkPollarProvider, usePollar } from "@pollar/react";
import type { SignAndSubmit } from "@/hooks/use-active-wallet";

export type PollarWalletValue = {
  address: string | null;
  signAndSubmit: SignAndSubmit | null;
  configured: boolean;
  login?: ReturnType<typeof usePollar>['login'];
  /**
   * Ends the Pollar session: revokes it server-side, then clears it from
   * browser storage. Resolves once the SDK is done (it never rejects for a
   * failed server call). Undefined when Pollar is not configured.
   */
  logout?: () => Promise<void>;
};

export const PollarWalletContext = createContext<PollarWalletValue>({
  address: null,
  signAndSubmit: null,
  configured: false,
});

function PollarAddressBridge({ children }: { children: ReactNode }) {
  const { wallet, signAndSubmitTx, login, logout } = usePollar();
  const currentAddress = wallet?.address ?? null;

  // The SDK keeps publishing the old wallet until its server revoke and local
  // clear finish. Hide the address of a session we are ending right away, so
  // the next user on this device is never offered it for signing (#587).
  const [endedAddress, setEndedAddress] = useState<string | null>(null);
  useEffect(() => {
    if (endedAddress && !currentAddress) setEndedAddress(null);
  }, [endedAddress, currentAddress]);

  const address = currentAddress && currentAddress === endedAddress ? null : currentAddress;

  const signAndSubmit: SignAndSubmit = async (unsignedXdr) => {
    const result = await signAndSubmitTx(unsignedXdr);
    if (result.status === 'error') {
      throw new Error(result.message ?? result.details ?? 'Pollar transaction submission failed.');
    }
  };

  const startLogin = useCallback<NonNullable<PollarWalletValue['login']>>(
    (options) => {
      setEndedAddress(null);
      login(options);
    },
    [login],
  );

  const endSession = useCallback(async () => {
    setEndedAddress(currentAddress);
    // Typed `() => void`, but the SDK returns PollarClient.logout()'s promise.
    await Promise.resolve(logout() as unknown);
  }, [logout, currentAddress]);

  return (
    <PollarWalletContext.Provider
      value={{ address, signAndSubmit, configured: true, login: startLogin, logout: endSession }}
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

/** How long logout waits for Pollar before redirecting anyway. */
export const POLLAR_LOGOUT_TIMEOUT_MS = 3_000;

/**
 * Best-effort Pollar logout for the SafeTrust logout flow: never throws and
 * never waits longer than `timeoutMs`, so a slow or failing Pollar server
 * can't hold up Firebase sign-out or the redirect.
 */
export async function endPollarSession(
  logout: PollarWalletValue['logout'],
  timeoutMs = POLLAR_LOGOUT_TIMEOUT_MS,
): Promise<void> {
  if (!logout) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(() => {
      console.warn('[auth/logout] Pollar logout is still running; continuing without it.');
      resolve();
    }, timeoutMs);
  });
  const attempt = Promise.resolve()
    .then(() => logout())
    .catch((error: unknown) => {
      console.warn('[auth/logout] Pollar logout failed:', error);
    });
  try {
    await Promise.race([attempt, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
