'use client';

import { usePollar } from '@pollar/react';
import { useWallet } from '@/components/auth/wallet/hooks/wallet.hook';

type ActiveWalletResult = {
  address: string | null;
  walletType: 'freighter' | 'pollar' | null;
  isReady: boolean;
  signAndSubmit: (unsignedXdr: string) => Promise<{ txHash: string }>;
};

export function useActiveWallet(): ActiveWalletResult {
  const { address: freighterAddress, signXDR } = useWallet();
  const pollarContext = (() => {
    try {
      return usePollar();
    } catch {
      return {
        isAuthenticated: false,
        wallet: null,
        getClient: () => null,
      };
    }
  })();
  const { isAuthenticated, wallet: pollarWallet, getClient } = pollarContext;

  const pollarAddress = isAuthenticated ? pollarWallet?.address ?? null : null;

  const address = freighterAddress || pollarAddress;
  const walletType = freighterAddress ? 'freighter' : pollarAddress ? 'pollar' : null;

  const signAndSubmit = async (unsignedXdr: string): Promise<{ txHash: string }> => {
    if (walletType === 'freighter') {
      const { signedXdr } = await signXDR(unsignedXdr);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';
      const res = await fetch(`${apiUrl}/api/escrow/send-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signedXdr }),
      });

      if (!res.ok) {
        throw new Error('failed to submit transaction via backend');
      }

      const data = await res.json();
      return { txHash: data.transactionHash };
    }

    if (walletType === 'pollar') {
      const client = getClient();
      const built = await client.buildTx({ xdr: unsignedXdr });
      const result = await client.signAndSubmitTx(built);
      return { txHash: result.hash };
    }

    throw new Error('no wallet connected');
  };

  return {
    address,
    walletType,
    isReady: !!address,
    signAndSubmit,
  };
}