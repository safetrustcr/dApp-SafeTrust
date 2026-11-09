import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signerFor } from './signers';
import { PollarSigningUnsupportedError, WalletRejectedError } from './errors';

const { freighter, kit } = vi.hoisted(() => ({ freighter: vi.fn(), kit: vi.fn() }));
vi.mock('@stellar/freighter-api', () => ({ signTransaction: freighter }));
vi.mock('@/components/auth/wallet/constants/wallet-kit.constant', () => ({
  getWalletKit: () => ({ signTransaction: kit }),
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

it('has no Pollar adapter', () => {
  expect(() => signerFor('pollar')).toThrow(PollarSigningUnsupportedError);
});
