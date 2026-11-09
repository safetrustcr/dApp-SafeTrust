import { signTransaction } from '@stellar/freighter-api';
import { getWalletKit } from '@/components/auth/wallet/constants/wallet-kit.constant';
import { PollarSigningUnsupportedError, WalletRejectedError } from './errors';

export type WalletProvider = 'freighter' | 'wallets-kit' | 'pollar';

export interface WalletSigner {
  sign(unsignedXdr: string, opts: { address: string; networkPassphrase: string }): Promise<string>;
}

// The SDKs can reject promises OR return errors. Normalize cancellation only;
// preserve other failures so callers can distinguish them and offer a retry.
async function signedXdr(call: () => Promise<{ signedTxXdr?: string; error?: unknown }>): Promise<string> {
  try {
    const result = await call();
    if (result.error) throw result.error;
    if (!result.signedTxXdr) throw new WalletRejectedError();
    return result.signedTxXdr;
  } catch (error) {
    if (error instanceof WalletRejectedError) throw error;
    const message = error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : String(error);
    if (/cancel|declin|reject|denied|user refused/i.test(message)) {
      throw new WalletRejectedError();
    }
    throw error;
  }
}

export const freighterSigner: WalletSigner = {
  sign: (xdr, opts) => signedXdr(() => signTransaction(xdr, opts)),
};

export const walletsKitSigner: WalletSigner = {
  sign: (xdr, opts) => signedXdr(() => getWalletKit().signTransaction(xdr, opts)),
};

const signers: Partial<Record<WalletProvider, WalletSigner>> = {
  freighter: freighterSigner,
  'wallets-kit': walletsKitSigner,
};

export function signerFor(provider: WalletProvider): WalletSigner {
  if (provider === 'pollar') throw new PollarSigningUnsupportedError();
  const signer = signers[provider];
  if (!signer) throw new Error('No supported wallet connected to sign transaction');
  return signer;
}
