// TODO: replace with real store once merged — frontend-SafeTrust/src/core/store/data.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  address: string | null;
  name: string | null;
  token: string | null;
  walletType: string | null;
  /** Stellar Wallets Kit identifier.  The display name is not stable enough to re-select a wallet. */
  stellarWalletId: string | null;
  isConnected: boolean;
  setAddress: (address: string | null) => void;
  setToken: (token: string | null) => void;
  connectWalletStore: (address: string, name: string, stellarWalletId?: string) => void;
  disconnectWalletStore: () => void;
  disconnect: () => void;
}

export const useGlobalAuthenticationStore = create<AuthState>()(
  persist(
    (set) => ({
      address: null,
      name: null,
      token: null,
      walletType: null,
      stellarWalletId: null,
      isConnected: false,

      setAddress: (address) => set({ address }),

      setToken: (token) => {
        // Sync cookie client-side only
        if (typeof document !== "undefined") {
          if (token) {
            document.cookie = `firebase-token=${token}; max-age=${7 * 24 * 60 * 60}; path=/; samesite=strict`;
          } else {
            document.cookie = "firebase-token=; max-age=0; path=/;";
          }
        }
        set({ token });
      },

      connectWalletStore: (address, name, stellarWalletId) => {
        set({
          address,
          name,
          walletType: name,
          stellarWalletId: stellarWalletId ?? null,
          isConnected: true,
        });
      },

      disconnectWalletStore: () => {
        if (typeof document !== "undefined") {
          document.cookie = "firebase-token=; max-age=0; path=/;";
          document.cookie = "auth-token=; max-age=0; path=/;";
        }
        set({
          address: null,
          name: null,
          token: null,
          walletType: null,
          stellarWalletId: null,
          isConnected: false,
        });
      },

      disconnect: () => {
        if (typeof document !== "undefined") {
          document.cookie = "firebase-token=; max-age=0; path=/;";
          document.cookie = "auth-token=; max-age=0; path=/;";
        }
        set({
          address: null,
          name: null,
          token: null,
          walletType: null,
          stellarWalletId: null,
          isConnected: false,
        });
      },
    }),
    {
      name: "safetrust-auth",
      partialize: (state) => ({
        address: state.address,
        name: state.name,
        token: state.token,
        walletType: state.walletType,
        stellarWalletId: state.stellarWalletId,
        isConnected: state.isConnected,
      }),
    }
  )
);
