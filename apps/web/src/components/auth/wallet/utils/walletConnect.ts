interface EthereumLikeProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

interface InjectedEthereumSession {
  address: string;
  chainId: number;
}

interface ProviderRequestError {
  code?: number | string;
  message?: string;
  data?: {
    code?: number | string;
    message?: string;
  };
}

function getEthereumProvider(): EthereumLikeProvider | null {
  if (typeof window === "undefined") {
    return null;
  }

  const ethereum = (window as Window & { ethereum?: unknown }).ethereum;
  if (!ethereum || typeof ethereum !== "object") {
    return null;
  }

  const request = (ethereum as { request?: unknown }).request;
  if (typeof request !== "function") {
    return null;
  }

  return ethereum as EthereumLikeProvider;
}

function isUserRejectedRequest(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const providerError = error as ProviderRequestError;
  const errorCodes = [providerError.code, providerError.data?.code];
  if (errorCodes.some((code) => code === 4001 || code === "4001" || code === "ACTION_REJECTED")) {
    return true;
  }

  const messages = [providerError.message, providerError.data?.message]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  return messages.some((message) => message.includes("user rejected") || message.includes("user denied"));
}

export async function connectInjectedEthereum(): Promise<InjectedEthereumSession | null> {
  const provider = getEthereumProvider();

  if (!provider) {
    return null;
  }

  let accountsResult: unknown;
  let chainIdResult: unknown;
  try {
    accountsResult = await provider.request({ method: "eth_requestAccounts" });
    chainIdResult = await provider.request({ method: "eth_chainId" });
  } catch (error) {
    if (isUserRejectedRequest(error)) {
      return null;
    }
    throw error;
  }

  if (!Array.isArray(accountsResult)) {
    throw new Error("Wallet provider returned an invalid accounts payload");
  }

  const accounts = accountsResult
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const primaryAccount = accounts[0];
  if (!primaryAccount) {
    return null;
  }

  let chainId = 0;
  if (typeof chainIdResult === "string") {
    chainId = Number.parseInt(chainIdResult, 16);
  } else if (typeof chainIdResult === "number") {
    chainId = chainIdResult;
  }

  return {
    address: primaryAccount,
    chainId: Number.isFinite(chainId) ? chainId : 0,
  };
}

export async function disconnectInjectedEthereum(): Promise<void> {
  const provider = getEthereumProvider();
  if (!provider) {
    return;
  }

  try {
    await provider.request({ method: "wallet_disconnect" });
  } catch {
    // Best effort only; some providers do not support wallet_disconnect.
  }
}
