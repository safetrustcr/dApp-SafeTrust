export type WalletType =
  | "freighter"
  | "albedo"
  | "lobstr"
  | "metamask"
  | "walletconnect";

export interface WalletInfo {
  address: string;
  name: string;
}

export interface WalletDetectionResult {
  freighter: boolean;
  albedo: boolean;
  lobstr: boolean;
  metamask: boolean;
  walletconnect: boolean;
}