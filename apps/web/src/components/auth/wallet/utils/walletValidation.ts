import { StrKey } from "@stellar/stellar-sdk";
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

const ETHEREUM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function isValidAddressForChain(address: string, chain: "stellar" | "ethereum"): boolean {
  if (chain === "stellar") {
    return StrKey.isValidEd25519PublicKey(address);
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
