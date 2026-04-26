import { useState, useCallback } from "react";
import {
  Horizon,
  TransactionBuilder,
  Operation,
  Networks,
  Asset,
  Memo,
  BASE_FEE,
} from "@stellar/stellar-sdk";
import { ISupportedWallet } from "@creit.tech/stellar-wallets-kit";
import { kit } from "../constants/wallet-kit.constant";
import {
  WalletInfo,
  WalletError,
  WalletType,
  StellarWalletType,
  MultiChainBalances,
  StellarPaymentOptions,
  StellarWalletInfo,
  EthereumWalletInfo,
} from "../types/wallet.types";
import { validateWalletConnection } from "../utils/walletValidation";

const Server = Horizon.Server;

const STELLAR_WALLET_TYPES: StellarWalletType[] = [
  "freighter",
  "albedo",
  "lobstr",
  "walletconnect",
  "rabet",
  "xbull",
  "hana",
];

const isStellarWalletType = (
  walletType: string,
): walletType is StellarWalletType =>
  STELLAR_WALLET_TYPES.includes(walletType as StellarWalletType);

export const useMultiWallet = (
  horizonUrl: string = "https://horizon-testnet.stellar.org",
  network: string = Networks.TESTNET,
) => {
  const [connectedWallets, setConnectedWallets] = useState<WalletInfo[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<WalletInfo>();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<WalletError>();
  const [balances, setBalances] = useState<MultiChainBalances>({
    stellar: [],
    ethereum: [],
  });
  const [server] = useState(() => new Server(horizonUrl));

  const connectStellarWallet = useCallback(async () => {
    setIsConnecting(true);
    setError(undefined);

    try {
      await kit.openModal({
        modalTitle: "Connect to your favorite Stellar wallet",
        onWalletSelected: async (option: ISupportedWallet) => {
          const walletType = option.id;
          if (!isStellarWalletType(walletType)) {
            throw new Error(`Unsupported Stellar wallet type: ${walletType}`);
          }

          kit.setWallet(option.id);

          const { address } = await kit.getAddress();
          const { name } = option;

          const walletInfo: StellarWalletInfo = {
            address,
            name,
            chain: "stellar",
            connectionStatus: "connected",
            walletType,
            balances: [],
            publicKey: address,
          };

          const validation = validateWalletConnection({
            address,
            chain: "stellar",
            walletType,
          });

          if (!validation.isValid) {
            throw new Error(validation.errors.join(", "));
          }

          setConnectedWallets((prev) => {
            const filtered = prev.filter((w) => w.walletType !== walletType);
            return [...filtered, walletInfo];
          });

          setSelectedWallet(walletInfo);
          refreshBalancesForKey(address); // Fire and forget
        },
      });
    } catch (error: any) {
      const walletError: WalletError = {
        code: "STELLAR_CONNECTION_FAILED",
        message: error.message || "Failed to connect Stellar wallet",
        details: error,
      };
      setError(walletError);
      throw walletError;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connectMetaMask = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("MetaMask not found");
    }

    let ethereum = (window as any).ethereum;

    // Handle multiple wallet providers (OKX, etc.)
    if (!ethereum.isMetaMask && ethereum.providers) {
      const metamaskProvider = ethereum.providers.find(
        (p: any) => p.isMetaMask,
      );
      if (!metamaskProvider) {
        throw new Error("MetaMask not found");
      }
      ethereum = metamaskProvider;
    }

    setIsConnecting(true);
    setError(undefined);

    try {
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      const chainId = await ethereum.request({ method: "eth_chainId" });

      if (!accounts.length) {
        throw new Error("No accounts found");
      }

      const walletInfo: EthereumWalletInfo = {
        address: accounts[0],
        name: "MetaMask",
        chain: "ethereum",
        connectionStatus: "connected",
        walletType: "metamask",
        chainId: parseInt(chainId, 16),
        balances: [],
      };

      const validation = validateWalletConnection({
        address: accounts[0],
        chain: "ethereum",
        walletType: "metamask",
      });

      if (!validation.isValid) {
        throw new Error(validation.errors.join(", "));
      }

      setConnectedWallets((prev) => [
        ...prev.filter((w) => w.walletType !== "metamask"),
        walletInfo,
      ]);

      setSelectedWallet(walletInfo);
    } catch (error: any) {
      setError({
        code: "METAMASK_CONNECTION_FAILED",
        message: error.message || "MetaMask connection failed",
        details: error,
      });
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  /**
   * Generic connect wallet method
   */
  const connectWallet = useCallback(
    async (walletType: WalletType) => {
      switch (walletType) {
        case "freighter":
        case "albedo":
        case "lobstr":
        case "rabet":
        case "xbull":
        case "hana":
          await connectStellarWallet();
          break;
        case "metamask":
          await connectMetaMask();
          break;
        case "walletconnect":
          throw new Error(
            "WalletConnect SDK pairing flow is not configured in this hook",
          );
        default:
          throw new Error(`Unsupported wallet type: ${walletType}`);
      }
    },
    [connectStellarWallet, connectMetaMask],
  );

  /**
   * Disconnect a specific wallet
   */
  const disconnectWallet = useCallback(
    async (walletType: WalletType) => {
      try {
        if (walletType !== "metamask" && walletType !== "walletconnect") {
          await kit.disconnect();
        }

        setConnectedWallets((prev) =>
          prev.filter((w) => w.walletType !== walletType),
        );

        if (selectedWallet?.walletType === walletType) {
          const remainingWallets = connectedWallets.filter(
            (w) => w.walletType !== walletType,
          );
          setSelectedWallet(remainingWallets[0] || undefined);
        }

        if (connectedWallets.length <= 1) {
          setBalances({ stellar: [], ethereum: [] });
        }
      } catch (error: any) {
        const walletError: WalletError = {
          code: "DISCONNECT_FAILED",
          message: error.message || "Failed to disconnect wallet",
          details: error,
        };
        setError(walletError);
        throw walletError;
      }
    },
    [selectedWallet, connectedWallets],
  );

  /**
   * Select a connected wallet as active
   */
  const selectWallet = useCallback((wallet: WalletInfo) => {
    setSelectedWallet(wallet);
    if (wallet.chain === "stellar") {
      refreshBalancesForKey(wallet.address);
    }
  }, []);

  /**
   * Reset all wallet connections
   */
  const reset = useCallback(() => {
    setConnectedWallets([]);
    setSelectedWallet(undefined);
    setError(undefined);
    setBalances({ stellar: [], ethereum: [] });
    setIsConnecting(false);
  }, []);

  const refreshBalancesForKey = useCallback(
    async (key: string) => {
      try {
        const account = await server.accounts().accountId(key).call();
        setBalances((previous) => ({ ...previous, stellar: account.balances }));
      } catch (error: any) {
        if (error?.response?.status === 404) {
          // Account not funded yet
          setBalances((previous) => ({ ...previous, stellar: [] }));
        } else {
          console.error("Balance fetch failed:", error);
          setBalances((previous) => ({ ...previous, stellar: [] }));
        }
      }
    },
    [server],
  );

  const refreshBalances = useCallback(async () => {
    if (!selectedWallet || selectedWallet.chain !== "stellar") return;
    refreshBalancesForKey(selectedWallet.address);
  }, [selectedWallet, refreshBalancesForKey]);

  /**
   * Send payment using the selected Stellar wallet
   */
  const sendPayment = useCallback(
    async (opts: StellarPaymentOptions) => {
      if (!selectedWallet || selectedWallet.chain !== "stellar") {
        throw new Error("No Stellar wallet selected");
      }

      try {
        const account = await server.loadAccount(selectedWallet.address);

        const asset =
          opts.asset === "XLM" || !opts.asset
            ? Asset.native()
            : new Asset(opts.asset.code, opts.asset.issuer);

        const txBuilder = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: network,
        });

        txBuilder.addOperation(
          Operation.payment({
            destination: opts.to,
            asset: asset,
            amount: opts.amount,
          }),
        );

        if (opts.memo) {
          txBuilder.addMemo(Memo.text(opts.memo));
        }

        txBuilder.setTimeout(30);
        const transaction = txBuilder.build();

        const { signedTxXdr } = await kit.signTransaction(transaction.toXDR(), {
          address: selectedWallet.address,
          networkPassphrase: network,
        });

        const signedTransaction = TransactionBuilder.fromXDR(
          signedTxXdr,
          network,
        );
        const result = await server.submitTransaction(signedTransaction);

        await refreshBalances();
        return result;
      } catch (error) {
        console.error("Payment failed:", error);
        throw error;
      }
    },
    [selectedWallet, server, network, refreshBalances],
  );

  return {
    connectedWallets,
    selectedWallet,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    selectWallet,
    reset,
    balances,
    refreshBalances,
    sendPayment: selectedWallet?.chain === "stellar" ? sendPayment : undefined,
    connectStellarWallet,
    connectMetaMask,
  };
};
