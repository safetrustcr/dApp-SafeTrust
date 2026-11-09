'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFreighter } from '@/hooks/use-freighter';
import { usePollarWallet } from '@/components/auth/pollar/PollarProvider';
import { getWalletKit } from '@/components/auth/wallet/constants/wallet-kit.constant';
import { useGlobalAuthenticationStore } from '@/core/store/data';
import { getAuthenticatedApi } from '@/lib/api/client';
import { auth } from '@/lib/firebase';
import { WalletNetwork } from '@creit.tech/stellar-wallets-kit';

import { signerFor, type WalletProvider } from './signers';
import { WalletRejectedError } from './errors';
export { WalletRejectedError, PollarSigningUnsupportedError } from './errors';

export type WalletBridge = {
  status: 'disconnected' | 'connecting' | 'connected' | 'unsupported';
  provider?: WalletProvider;
  address?: string;
  isRegistered: boolean; // address is the user's primary user_wallets entry
  connect(provider?: WalletBridge['provider']): Promise<void>;
  disconnect(): Promise<void>;
  sign(xdr: string, networkPassphrase?: string): Promise<string>; // throws WalletRejectedError on cancel
};

export function useWalletBridge(): WalletBridge {
  const freighter = useFreighter();
  const pollar = usePollarWallet();
  const storedAddress = useGlobalAuthenticationStore((state) => state.address);
  const stellarWalletId = useGlobalAuthenticationStore((state) => state.stellarWalletId);
  const storedWalletType = useGlobalAuthenticationStore((state) => state.walletType);
  const connectWalletStore = useGlobalAuthenticationStore((state) => state.connectWalletStore);
  const disconnectWalletStore = useGlobalAuthenticationStore((state) => state.disconnectWalletStore);

  const [connecting, setConnecting] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // A stored selection is authoritative. An installed extension or a second
  // logged-in wallet must never change the signer for that selected account.
  const { address: resolvedAddress, provider: resolvedProvider } = useMemo(() => {
    if (storedAddress) {
      const type = storedWalletType?.toLowerCase();
      const provider: WalletProvider | undefined = type === 'pollar'
        ? 'pollar'
        : stellarWalletId
          ? 'wallets-kit'
          : type === 'freighter'
            ? 'freighter'
            : undefined;
      return { address: storedAddress, provider };
    }
    if (pollar.address) {
      return { address: pollar.address, provider: 'pollar' as const };
    }
    return {
      address: freighter?.address || undefined,
      provider: freighter?.address ? 'freighter' as const : undefined,
    };
  }, [storedAddress, storedWalletType, stellarWalletId, pollar.address, freighter?.address]);

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
          } else {
            throw new Error('Pollar is not configured in this environment');
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

  // This is the only application entry point for signed XDR. Selection is
  // explicit: no SDK availability checks and no fallback to a different wallet.
  const sign = useCallback(
    async (unsignedXdr: string, networkPassphrase?: string): Promise<string> => {
      if (!resolvedAddress || !resolvedProvider) {
        throw new Error('No supported wallet connected to sign transaction');
      }
      const signer = signerFor(resolvedProvider);
      if (resolvedProvider === 'wallets-kit') {
        if (!stellarWalletId) throw new Error('Reconnect your Stellar wallet before signing');
        getWalletKit().setWallet(stellarWalletId);
      }
      return signer.sign(unsignedXdr, {
        address: resolvedAddress,
        networkPassphrase: networkPassphrase || process.env.NEXT_PUBLIC_STELLAR_NETWORK || WalletNetwork.TESTNET,
      });
    },
    [resolvedAddress, resolvedProvider, stellarWalletId],
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
