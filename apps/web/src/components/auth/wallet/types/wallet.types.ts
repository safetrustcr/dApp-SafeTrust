export type WalletType =
  | "freighter"
  | "albedo"
  | "lobstr"
  | "metamask"
  | "walletconnect"
  | "rabet"
  | "xbull"
  | "hana";

export type WalletChain = "stellar" | "ethereum";

export type WalletConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error";

export interface WalletDetectionResult {
  freighter: boolean;
  albedo: boolean;
  lobstr: boolean;
  metamask: boolean;
  walletconnect: boolean;
  rabet?: boolean;
  xbull?: boolean;
  hana?: boolean;
}

export interface WalletError {
  code: string;
  message: string;
  details?: unknown;
}

export interface StellarBalance {
  asset_type: string;
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
  limit?: string;
  buying_liabilities?: string;
  selling_liabilities?: string;
}

export interface EthereumBalance {
  balance: string;
  symbol: string;
  tokenContract?: string;
  decimals?: number;
}

interface BaseWalletInfo {
  address: string;
  name: string;
  chain: WalletChain;
  connectionStatus: WalletConnectionStatus;
  walletType: WalletType;
}

export interface StellarWalletInfo extends BaseWalletInfo {
  chain: "stellar";
  balances: StellarBalance[];
  publicKey: string;
}

export interface EthereumWalletInfo extends BaseWalletInfo {
  chain: "ethereum";
  chainId: number;
  balances: EthereumBalance[];
}

export type WalletInfo = StellarWalletInfo | EthereumWalletInfo;

export interface MultiChainBalances {
  stellar?: StellarBalance[];
  ethereum?: EthereumBalance[];
}

export interface MultiWalletState {
  connectedWallets: WalletInfo[];
  selectedWallet?: WalletInfo;
  isConnecting: boolean;
  error?: WalletError;
  balances: MultiChainBalances;
}

export interface StellarPaymentOptions {
  to: string;
  amount: string;
  memo?: string;
  asset?: "XLM" | { code: string; issuer: string };
}

export interface EvmPaymentOptions {
  to: string;
  amountWei: string;
  tokenContract?: string;
}
