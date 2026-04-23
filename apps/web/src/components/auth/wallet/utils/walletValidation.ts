import { WalletType } from "../types/wallet.types";

interface ValidationInput {
  address: string;
  chain: "stellar" | "ethereum";
  walletType: WalletType | string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/;
const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function isValidAddressForChain(address: string, chain: "stellar" | "ethereum"): boolean {
  if (chain === "stellar") {
    return STELLAR_PUBLIC_KEY_REGEX.test(address);
  }

  return ETHEREUM_ADDRESS_REGEX.test(address);
}

export function validateWalletConnection({
  address,
  chain,
  walletType,
}: ValidationInput): ValidationResult {
  const errors: string[] = [];

  if (!address) {
    errors.push("Wallet address is required");
  } else if (!isValidAddressForChain(address, chain)) {
    errors.push(`Invalid ${chain} wallet address`);
  }

  if (!walletType) {
    errors.push("Wallet type is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
