// TODO: replace with real WalletConnect integration once merged — frontend-SafeTrust/src/components/auth/wallet/utils/walletConnect.ts

interface WalletConnectResult {
  address: string;
  chainId: number;
}

export async function connectWalletConnect(): Promise<WalletConnectResult | null> {
  // Stub — real implementation wires up WalletConnect v2
  return null;
}

export async function disconnectWalletConnect(): Promise<void> {
  // Stub — real implementation disconnects WalletConnect session
}
