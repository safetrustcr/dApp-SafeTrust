export type WalletType =
  | "freighter"
  | "albedo"
  | "lobstr"
  | "metamask"
  | "walletconnect"
  | "rabet"
  | "xbull"
  | "hana";

export type StellarWalletType = Exclude<WalletType, "metamask">;
export type EthereumWalletType = Extract<WalletType, "metamask" | "walletconnect">;

export type WalletChain = "stellar" | "ethereum";

export type WalletConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "error";

export type WalletDetectionResult = Record<WalletType, boolean>;

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

interface BaseWalletInfo<TChain extends WalletChain, TWalletType extends WalletType> {
  address: string;
  name: string;
  chain: TChain;
  connectionStatus: WalletConnectionStatus;
  walletType: TWalletType;
}

export interface StellarWalletInfo
  extends BaseWalletInfo<"stellar", StellarWalletType> {
  chain: "stellar";
  balances: StellarBalance[];
  publicKey: string;
}

export interface EthereumWalletInfo
  extends BaseWalletInfo<"ethereum", EthereumWalletType> {
  chain: "ethereum";
  chainId: number;
  balances: EthereumBalance[];
}

export type WalletInfo = StellarWalletInfo | EthereumWalletInfo;

export interface MultiChainBalances {
  stellar: StellarBalance[];
  ethereum: EthereumBalance[];
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

/**
 * Reserved for the upcoming EVM `sendPayment` implementation.
 * Currently unused. `amountWei` must be a wei-denominated bigint-as-string.
 */
export interface EvmPaymentOptions {
  to: string;
  amountWei: string;
  tokenContract?: string;
}
