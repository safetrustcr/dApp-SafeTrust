// TODO: replace with real validation once merged — frontend-SafeTrust/src/components/auth/wallet/utils/walletValidation.ts

interface ValidationInput {
  address: string;
  chain: "stellar" | "ethereum";
  walletType: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateWalletConnection(
  input: ValidationInput,
): ValidationResult {
  const errors: string[] = [];

  if (!input.address || input.address.trim() === "") {
    errors.push("Wallet address is required");
  }

  if (
    input.chain === "stellar" &&
    input.address &&
    !input.address.startsWith("G")
  ) {
    errors.push("Invalid Stellar address format");
  }

  if (
    input.chain === "ethereum" &&
    input.address &&
    !input.address.startsWith("0x")
  ) {
    errors.push("Invalid Ethereum address format");
  }

  return { isValid: errors.length === 0, errors };
}
