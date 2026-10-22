'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useActiveWallet } from '@/hooks/use-active-wallet';
import { useFreighter } from '@/hooks/use-freighter';
import { usePollar } from '@pollar/react';
import { getWalletKit } from '@/components/auth/wallet/constants/wallet-kit.constant';
import { useGlobalAuthenticationStore } from '@/core/store/data';
import { getAuthenticatedApi } from '@/lib/api/client';
import { auth } from '@/lib/firebase';
import { signTransaction } from '@stellar/freighter-api';
import { WalletNetwork } from '@creit.tech/stellar-wallets-kit';

export class WalletRejectedError extends Error {
  constructor(message: string = 'Signature cancelled') {
    super(message);
    this.name = 'WalletRejectedError';
  }
}

export type WalletBridge = {
  status: 'disconnected' | 'connecting' | 'connected' | 'unsupported';
  provider?: 'pollar' | 'freighter' | 'other';
  address?: string;
  isRegistered: boolean; // address is the user's primary user_wallets entry
  connect(provider?: WalletBridge['provider']): Promise<void>;
  disconnect(): Promise<void>;
  sign(xdr: string): Promise<string>; // throws WalletRejectedError on cancel
};

export function useWalletBridge(): WalletBridge {
  const freighter = useFreighter();
  const pollar = usePollar();
  const activeWallet = useActiveWallet();
  const storedAddress = useGlobalAuthenticationStore((state) => state.address);
  const storedWalletType = useGlobalAuthenticationStore((state) => state.walletType);
  const connectWalletStore = useGlobalAuthenticationStore((state) => state.connectWalletStore);
  const disconnectWalletStore = useGlobalAuthenticationStore((state) => state.disconnectWalletStore);

  const [connecting, setConnecting] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Address resolution: activeWallet takes precedence, then storedAddress, freighter, pollar
  const resolvedAddress = useMemo(() => {
    return (
      activeWallet?.address ||
      storedAddress ||
      freighter?.address ||
      pollar?.wallet?.address ||
      undefined
    );
  }, [activeWallet?.address, storedAddress, freighter?.address, pollar?.wallet?.address]);

  // Provider resolution
  const resolvedProvider: WalletBridge['provider'] = useMemo(() => {
    if (!resolvedAddress) return undefined;
    if (activeWallet?.walletType === 'freighter' || storedWalletType?.toLowerCase().includes('freighter')) {
      return 'freighter';
    }
    if (activeWallet?.walletType === 'pollar' || storedWalletType?.toLowerCase().includes('pollar') || pollar?.isAuthenticated) {
      return 'pollar';
    }
    return 'other';
  }, [resolvedAddress, activeWallet?.walletType, storedWalletType, pollar?.isAuthenticated]);

  // Overall status resolution
  const status: WalletBridge['status'] = useMemo(() => {
    if (unsupported) return 'unsupported';
    if (connecting) return 'connecting';
    if (resolvedAddress) return 'connected';
    return 'disconnected';
  }, [unsupported, connecting, resolvedAddress]);

  // Verify registration against API (#443 rules)
  // Queries the backend API directly — NEVER reads registration from local storage.
  useEffect(() => {
    let cancelled = false;

    async function checkRegistration() {
      if (!resolvedAddress || !auth.currentUser) {
        if (!cancelled) setIsRegistered(false);
        return;
      }

      try {
        const response = await getAuthenticatedApi<{ primaryWallet: string | null }>(
          '/api/auth/sync-wallet',
        );
        if (!cancelled) {
          const primary = response?.primaryWallet;
          setIsRegistered(Boolean(primary && primary.toLowerCase() === resolvedAddress.toLowerCase()));
        }
      } catch {
        if (!cancelled) {
          setIsRegistered(false);
        }
      }
    }

    void checkRegistration();

    return () => {
      cancelled = true;
    };
  }, [resolvedAddress]);

  // Connect handler
  const connect = useCallback(
    async (targetProvider?: WalletBridge['provider']) => {
      setConnecting(true);
      setUnsupported(false);

      try {
        if (targetProvider === 'freighter') {
          // Check if Freighter extension is available in current browser
          const freighterApi = typeof window !== 'undefined' ? (window as any).freighterApi : undefined;
          if (!freighterApi) {
            setUnsupported(true);
            throw new Error('Freighter wallet is not installed in this browser');
          }

          const connected = await freighterApi.isConnected();
          if (!connected) {
            // Request access
            await freighterApi.requestAccess?.();
          }

          const { publicKey } = await freighterApi.getPublicKey();
          if (!publicKey) {
            throw new WalletRejectedError('Wallet connection was cancelled');
          }

          connectWalletStore(publicKey, 'Freighter', 'freighter');
        } else if (targetProvider === 'pollar') {
          if (pollar?.login) {
            await pollar.login({ provider: 'google' });
          }
        } else {
          // Default to Stellar Wallets Kit
          const kit = getWalletKit();
          await new Promise<void>((resolve, reject) => {
            kit
              .openModal({
                modalTitle: 'Connect a Stellar wallet',
                onWalletSelected: async (wallet) => {
                  try {
                    kit.setWallet(wallet.id);
                    const { address } = await kit.getAddress();
                    connectWalletStore(address, wallet.name, wallet.id);
                    resolve();
                  } catch (err) {
                    reject(err);
                  }
                },
                onClosed: () => {
                  reject(new WalletRejectedError('Wallet connection was cancelled'));
                },
              })
              .catch(reject);
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('cancelled') ||
          msg.includes('User declined') ||
          msg.includes('rejected') ||
          err instanceof WalletRejectedError
        ) {
          throw new WalletRejectedError('Wallet connection was cancelled');
        }
        throw err;
      } finally {
        setConnecting(false);
      }
    },
    [connectWalletStore, pollar],
  );

  // Disconnect handler
  const disconnect = useCallback(async () => {
    try {
      const kit = getWalletKit();
      await kit.disconnect().catch(() => {});
    } finally {
      disconnectWalletStore();
      setIsRegistered(false);
    }
  }, [disconnectWalletStore]);

  // Sign XDR transaction
  const sign = useCallback(
    async (unsignedXdr: string): Promise<string> => {
      if (!resolvedAddress) {
        throw new Error('No wallet connected to sign transaction');
      }

      try {
        if (resolvedProvider === 'freighter' || (typeof window !== 'undefined' && (window as any).freighterApi)) {
          const { signedTxXdr } = await signTransaction(unsignedXdr, {
            address: resolvedAddress,
            networkPassphrase: process.env.NEXT_PUBLIC_STELLAR_NETWORK || WalletNetwork.TESTNET,
          });
          if (!signedTxXdr) {
            throw new WalletRejectedError('Signature cancelled');
          }
          return signedTxXdr;
        }

        // Stellar Wallets Kit fallback
        const kit = getWalletKit();
        const { signedTxXdr } = await kit.signTransaction(unsignedXdr, {
          address: resolvedAddress,
          networkPassphrase: process.env.NEXT_PUBLIC_STELLAR_NETWORK || WalletNetwork.TESTNET,
        });

        if (!signedTxXdr) {
          throw new WalletRejectedError('Signature cancelled');
        }

        return signedTxXdr;
      } catch (err: unknown) {
        if (err instanceof WalletRejectedError) {
          throw err;
        }

        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes('User declined') ||
          msg.includes('cancelled') ||
          msg.includes('rejected') ||
          msg.includes('Signature rejected')
        ) {
          throw new WalletRejectedError('Signature cancelled');
        }

        throw new Error(`Wallet signing failed: ${msg}`);
      }
    },
    [resolvedAddress, resolvedProvider],
  );

  return {
    status,
    provider: resolvedProvider,
    address: resolvedAddress,
    isRegistered,
    connect,
    disconnect,
    sign,
  };
}
