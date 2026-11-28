import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signerFor } from './signers';
import { WalletRejectedError } from './errors';

const { freighter, kit, pollar } = vi.hoisted(() => ({
  freighter: vi.fn(),
  kit: vi.fn(),
  pollar: vi.fn(),
}));
vi.mock('@stellar/freighter-api', () => ({ signTransaction: freighter }));
vi.mock('@/components/auth/wallet/constants/wallet-kit.constant', () => ({
  getWalletKit: () => ({ signTransaction: kit }),
}));
vi.mock('@pollar/core', () => ({
  signTx: pollar,
}));

const options = { address: 'GSELECTED', networkPassphrase: 'Test SDF Network ; September 2015' };

describe.each(['freighter', 'wallets-kit'] as const)('%s signer', (provider) => {
  beforeEach(() => vi.resetAllMocks());

  it('passes the requested XDR, address and network to its SDK', async () => {
    const sdk = provider === 'freighter' ? freighter : kit;
    sdk.mockResolvedValue({ signedTxXdr: 'SIGNED' });
    await expect(signerFor(provider).sign('UNSIGNED', options)).resolves.toBe('SIGNED');
    expect(sdk).toHaveBeenCalledWith('UNSIGNED', options);
    expect(provider === 'freighter' ? kit : freighter).not.toHaveBeenCalled();
  });

  it.each(['User declined', 'Signature rejected', 'Cancelled', 'User denied access'])(
    'normalizes %s to WalletRejectedError', async (message) => {
      (provider === 'freighter' ? freighter : kit).mockRejectedValue(new Error(message));
      await expect(signerFor(provider).sign('XDR', options)).rejects.toThrow(WalletRejectedError);
    },
  );

  it('treats an empty signature as cancellation', async () => {
    (provider === 'freighter' ? freighter : kit).mockResolvedValue({ signedTxXdr: '' });
    await expect(signerFor(provider).sign('XDR', options)).rejects.toThrow(WalletRejectedError);
  });

  it('preserves errors unrelated to cancellation', async () => {
    const failure = new Error('Network unavailable');
    (provider === 'freighter' ? freighter : kit).mockRejectedValue(failure);
    await expect(signerFor(provider).sign('XDR', options)).rejects.toBe(failure);
  });
});

it('normalizes Freighter returned errors without accepting a missing signature', async () => {
  freighter.mockResolvedValue({ error: { code: -4, message: 'User rejected request' } });
  await expect(signerFor('freighter').sign('XDR', options)).rejects.toThrow(WalletRejectedError);
});

describe('pollar signer', () => {
  beforeEach(() => vi.resetAllMocks());

  it('signerFor("pollar") returns the pollar signer adapter', () => {
    expect(() => signerFor('pollar')).not.toThrow();
    const signer = signerFor('pollar');
    expect(signer).toBeDefined();
    expect(typeof signer.sign).toBe('function');
  });

  it('pollar signer returns signedXdr on status: signed', async () => {
    pollar.mockResolvedValue({ status: 'signed', signedXdr: 'mock-xdr' });
    const result = await signerFor('pollar').sign('UNSIGNED_XDR', options);
    expect(result).toBe('mock-xdr');
    expect(pollar).toHaveBeenCalledWith('UNSIGNED_XDR');
  });

  it('pollar signer maps status: error user rejection to WalletRejectedError', async () => {
    pollar.mockResolvedValue({
      status: 'error',
      details: 'User declined',
      code: 'USER_REJECTED',
      message: 'User declined to sign transaction',
    });
    await expect(signerFor('pollar').sign('UNSIGNED_XDR', options)).rejects.toThrow(WalletRejectedError);
  });

  it('pollar signer maps non-rejection error to plain Error', async () => {
    pollar.mockResolvedValue({
      status: 'error',
      details: 'Ledger connection timed out',
      code: 'INTERNAL_ERROR',
      message: 'Network error',
    });
    const signPromise = signerFor('pollar').sign('UNSIGNED_XDR', options);
    await expect(signPromise).rejects.toThrow('Network error');
    await expect(signPromise).rejects.not.toThrow(WalletRejectedError);
  });
});
