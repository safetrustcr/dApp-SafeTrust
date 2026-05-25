// TODO: replace with real store once merged — frontend-SafeTrust/src/core/store/data.ts
import { create } from "zustand";

interface AuthState {
  address: string | null;
  name: string | null;
  token: string | null;
  walletType: string | null;
  isConnected: boolean;
  setAddress: (address: string | null) => void;
  setToken: (token: string | null) => void;
  connectWalletStore: (address: string, name: string) => void;
  disconnectWalletStore: () => void;
  disconnect: () => void;
}

export const useGlobalAuthenticationStore = create<AuthState>((set) => ({
  address: null,
  name: null,
  token: null,
  walletType: null,
  isConnected: false,
  setAddress: (address) => set({ address }),
  setToken: (token) => set({ token }),
  connectWalletStore: (address, name) =>
    set({ address, name, walletType: name, isConnected: true }),
  disconnectWalletStore: () =>
    set({ address: null, name: null, token: null, walletType: null, isConnected: false }),
  disconnect: () =>
    set({ address: null, name: null, token: null, walletType: null, isConnected: false }),
}));
