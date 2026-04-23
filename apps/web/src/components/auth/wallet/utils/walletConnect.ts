interface EthereumLikeProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

interface WalletConnectSession {
  address: string;
  chainId: number;
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

export async function connectWalletConnect(): Promise<WalletConnectSession | null> {
  const provider = getEthereumProvider();

  if (!provider) {
    throw new Error("Wallet provider not available");
  }

  const accountsResult = await provider.request({ method: "eth_requestAccounts" });
  const chainIdResult = await provider.request({ method: "eth_chainId" });

  if (!Array.isArray(accountsResult)) {
    throw new Error("Wallet provider returned an invalid accounts payload");
  }

  const accounts = accountsResult.filter((value): value is string => typeof value === "string");
  if (accounts.length === 0) {
    return null;
  }

  let chainId = 0;
  if (typeof chainIdResult === "string") {
    chainId = Number.parseInt(chainIdResult, 16);
  } else if (typeof chainIdResult === "number") {
    chainId = chainIdResult;
  }

  return {
    address: accounts[0],
    chainId: Number.isFinite(chainId) ? chainId : 0,
  };
}

export async function disconnectWalletConnect(): Promise<void> {
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
