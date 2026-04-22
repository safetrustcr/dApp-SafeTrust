// TODO: replace with real store once merged — frontend-SafeTrust/src/core/store/data.ts
import { create } from 'zustand';

interface AuthState {
  address: string | null;
  setAddress: (address: string | null) => void;
  disconnect: () => void;
}

export const useGlobalAuthenticationStore = create<AuthState>((set) => ({
  address: null,
  setAddress: (address) => set({ address }),
  disconnect: () => set({ address: null }),
}));
