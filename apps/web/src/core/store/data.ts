// TODO: replace with real store once merged — frontend-SafeTrust/src/core/store/data.ts
import { create } from 'zustand';

interface AuthState {
  address: string | null;
  name: string | null;
  setAddress: (address: string | null) => void;
  connectWalletStore: (address: string, name: string) => void;
  disconnectWalletStore: () => void;
  disconnect: () => void;
}

export const useGlobalAuthenticationStore = create<AuthState>((set) => ({
  address: null,
  name: null,
  setAddress: (address) => set((state) => ({ address, name: address ? state.name : null })),
  connectWalletStore: (address, name) => set({ address, name }),
  disconnectWalletStore: () => set({ address: null, name: null }),
  disconnect: () => set({ address: null, name: null }),
}));
