// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useActiveWallet } from './use-active-wallet';

const mocks = vi.hoisted(() => ({
  store: { address: 'GKIT', walletType: 'xBull', stellarWalletId: 'xbull' as string | null },
  sign: vi.fn(), post: vi.fn(), setWallet: vi.fn(), pollar: vi.fn(),
}));
vi.mock('@/core/store/data', () => ({
  useGlobalAuthenticationStore: (selector: (state: typeof mocks.store) => unknown) => selector(mocks.store),
}));
vi.mock('@/hooks/use-freighter', () => ({ useFreighter: () => ({ address: 'GFREIGHTER' }) }));
vi.mock('@/components/auth/pollar/PollarProvider', () => ({ usePollarWallet: () => ({ address: null }) }));
vi.mock('@/components/auth/wallet/constants/wallet-kit.constant', () => ({
  getWalletKit: () => ({ setWallet: mocks.setWallet, signTransaction: mocks.sign }),
}));
vi.mock('@pollar/core', () => ({
  signTx: mocks.pollar,
}));
vi.mock('@/lib/api/escrow', () => ({ postEscrowApi: mocks.post }));
vi.mock('@/lib/api/client', () => ({ getAuthenticatedApi: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ auth: { currentUser: null } }));

beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(mocks.store, { address: 'GKIT', walletType: 'xBull', stellarWalletId: 'xbull' });
  mocks.sign.mockResolvedValue({ signedTxXdr: 'SIGNED_ESCROW' });
  mocks.pollar.mockResolvedValue({ status: 'signed', signedXdr: 'SIGNED_POLLAR' });
});

const submission = { contractId: 'contract', engagementId: 'engagement', senderAddress: 'GKIT', receiverAddress: 'GHOST', networkPassphrase: 'API_NETWORK' };

it('signs escrow through the real bridge and submits only to the verification API', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  const { result } = renderHook(() => useActiveWallet());
  expect(result.current.walletType).toBe('stellar-kit');
  expect(result.current.isReady).toBe(true);
  await result.current.signAndSubmit('UNSIGNED', submission);
  expect(mocks.setWallet).toHaveBeenCalledWith('xbull');
  expect(mocks.sign).toHaveBeenCalledWith('UNSIGNED', { address: 'GKIT', networkPassphrase: 'API_NETWORK' });
  expect(mocks.post).toHaveBeenCalledWith('/api/escrow/send-transaction', { signedXdr: 'SIGNED_ESCROW' });
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
});

it('submits signed transaction when Pollar is selected', async () => {
  Object.assign(mocks.store, { address: 'GPOLLAR', walletType: 'Pollar', stellarWalletId: null });
  const { result } = renderHook(() => useActiveWallet());
  expect(result.current.walletType).toBe('pollar');
  expect(result.current.isReady).toBe(true);
  await result.current.signAndSubmit('UNSIGNED', submission);
  expect(mocks.pollar).toHaveBeenCalledWith('UNSIGNED');
  expect(mocks.sign).not.toHaveBeenCalled();
  expect(mocks.post).toHaveBeenCalledWith('/api/escrow/send-transaction', { signedXdr: 'SIGNED_POLLAR' });
});

it('does not submit escrow after a signing rejection', async () => {
  mocks.sign.mockRejectedValue(new Error('User rejected signature'));
  const { result } = renderHook(() => useActiveWallet());
  await expect(result.current.signAndSubmit('UNSIGNED', submission)).rejects.toThrow('Signature cancelled');
  expect(mocks.post).not.toHaveBeenCalled();
});
