// TODO: replace with real types once merged — frontend-SafeTrust/src/components/auth/wallet/types/wallet.types.ts

export type WalletType =
  | "freighter"
  | "albedo"
  | "lobstr"
  | "metamask"
  | "walletconnect";

export interface WalletInfo {
  address: string;
  name: string;
  chain: "stellar" | "ethereum";
  connectionStatus: "connected" | "disconnected" | "connecting";
  walletType: WalletType;
  balances?: Balance[];
}

export interface StellarWalletInfo extends WalletInfo {
  chain: "stellar";
  publicKey: string;
}

export interface EthereumWalletInfo extends WalletInfo {
  chain: "ethereum";
  chainId: number;
}

export interface Balance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
}

export interface WalletError {
  code: string;
  message: string;
  details?: unknown;
}

export interface MultiWalletState {
  connectedWallets: WalletInfo[];
  selectedWallet?: WalletInfo;
  isConnecting: boolean;
  error?: WalletError;
}

export interface PaymentOptions {
  to: string;
  amount: string;
  asset?: "XLM" | { code: string; issuer: string };
  memo?: string;
}

export interface WalletDetectionResult {
  freighter: boolean;
  albedo: boolean;
  lobstr: boolean;
  metamask: boolean;
  walletconnect: boolean;
}
