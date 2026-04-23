// TODO: replace with real store once merged — frontend-SafeTrust/src/core/store/data.ts
import { create } from "zustand";

interface AuthState {
  address: string | null;
  name: string | null;
  walletType: string | null;
  isConnected: boolean;
  setAddress: (address: string | null) => void;
  connectWalletStore: (address: string, walletType: string) => void;
  disconnectWalletStore: () => void;
  disconnect: () => void;
}

export const useGlobalAuthenticationStore = create<AuthState>((set) => ({
  address: null,
  name: null,
  walletType: null,
  isConnected: false,
  setAddress: (address) => set({ address }),
  connectWalletStore: (address, walletType) =>
    set({ address, name: walletType, walletType, isConnected: true }),
  disconnectWalletStore: () =>
    set({ address: null, name: null, walletType: null, isConnected: false }),
  disconnect: () =>
    set({ address: null, name: null, walletType: null, isConnected: false }),
}));
