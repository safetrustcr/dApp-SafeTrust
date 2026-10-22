/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock values hoisted for vitest
const mockFreighter = { address: null as string | null, signAndSubmit: vi.fn() };
const mockPollar = { isAuthenticated: false, wallet: { address: null as string | null }, login: vi.fn() };
const mockActiveWallet = { address: null as string | null, walletType: null as string | null, isReady: false, signAndSubmit: vi.fn() };
const mockStore = {
  address: null as string | null,
  walletType: null as string | null,
  connectWalletStore: vi.fn((addr, name) => {
    mockStore.address = addr;
    mockStore.walletType = name;
  }),
  disconnectWalletStore: vi.fn(() => {
    mockStore.address = null;
    mockStore.walletType = null;
  }),
};
const mockKit = {
  disconnect: vi.fn(async () => {}),
  openModal: vi.fn(async () => {}),
  setWallet: vi.fn(async () => {}),
  getAddress: vi.fn(async () => ({ address: 'GKITWALLET123' })),
  signTransaction: vi.fn(async () => ({ signedTxXdr: 'SIGNED_TX_XDR_KIT' })),
};
const mockSignTransaction = vi.fn(async () => ({ signedTransaction: 'SIGNED_TX_XDR_FREIGHTER', signedTxXdr: 'SIGNED_TX_XDR_FREIGHTER' }));
const mockGetAuthenticatedApi = vi.fn();
const mockAuth = {
  currentUser: { uid: 'user-123', getIdToken: vi.fn(async () => 'mock-token') } as any,
};

vi.mock('@/hooks/use-freighter', () => ({
  useFreighter: () => mockFreighter,
}));

vi.mock('@pollar/react', () => ({
  usePollar: () => mockPollar,
}));

vi.mock('@/hooks/use-active-wallet', () => ({
  useActiveWallet: () => mockActiveWallet,
}));

vi.mock('@/core/store/data', () => ({
  useGlobalAuthenticationStore: (selector: any) => selector(mockStore),
}));

vi.mock('@/components/auth/wallet/constants/wallet-kit.constant', () => ({
  getWalletKit: () => mockKit,
}));

vi.mock('@/lib/api/client', () => ({
  getAuthenticatedApi: (...args: any[]) => mockGetAuthenticatedApi(...args),
}));

vi.mock('@/lib/firebase', () => ({
  auth: mockAuth,
}));

vi.mock('@stellar/freighter-api', () => ({
  signTransaction: (...args: any[]) => mockSignTransaction(...args),
}));

import { useWalletBridge, WalletRejectedError } from './use-wallet-bridge';

describe('useWalletBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFreighter.address = null;
    mockPollar.isAuthenticated = false;
    mockPollar.wallet = { address: null };
    mockActiveWallet.address = null;
    mockActiveWallet.walletType = null;
    mockStore.address = null;
    mockStore.walletType = null;
    mockAuth.currentUser = { uid: 'user-123' };
    delete (window as any).freighterApi;
  });

  it('initializes with disconnected status when no wallet is active', () => {
    const { result } = renderHook(() => useWalletBridge());
    expect(result.current.status).toBe('disconnected');
    expect(result.current.address).toBeUndefined();
    expect(result.current.provider).toBeUndefined();
    expect(result.current.isRegistered).toBe(false);
  });

  it('marks status connected when freighter address is present', () => {
    mockFreighter.address = 'GBFREIGHTER12345678901234567890123456789012345678901234';
    mockActiveWallet.address = mockFreighter.address;
    mockActiveWallet.walletType = 'freighter';

    const { result } = renderHook(() => useWalletBridge());
    expect(result.current.status).toBe('connected');
    expect(result.current.provider).toBe('freighter');
    expect(result.current.address).toBe(mockFreighter.address);
  });

  it('marks status connected when pollar address is present', () => {
    mockPollar.isAuthenticated = true;
    mockPollar.wallet = { address: 'GPOLLAR12345678901234567890123456789012345678901234' };
    mockActiveWallet.address = mockPollar.wallet.address;
    mockActiveWallet.walletType = 'pollar';

    const { result } = renderHook(() => useWalletBridge());
    expect(result.current.status).toBe('connected');
    expect(result.current.provider).toBe('pollar');
    expect(result.current.address).toBe(mockPollar.wallet.address);
  });

  it('connects freighter when extension is present', async () => {
    (window as any).freighterApi = {
      isConnected: vi.fn(async () => true),
      getPublicKey: vi.fn(async () => ({ publicKey: 'GFREIGHTER_PUBKEY' })),
    };

    const { result } = renderHook(() => useWalletBridge());

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(mockStore.connectWalletStore).toHaveBeenCalledWith('GFREIGHTER_PUBKEY', 'Freighter', 'freighter');
  });

  it('sets status to unsupported when freighter is requested but extension is missing', async () => {
    delete (window as any).freighterApi;

    const { result } = renderHook(() => useWalletBridge());

    await act(async () => {
      await expect(result.current.connect('freighter')).rejects.toThrow(
        'Freighter wallet is not installed in this browser',
      );
    });

    expect(result.current.status).toBe('unsupported');
  });

  it('disconnects and resets wallet store cleanly', async () => {
    mockStore.address = 'GCONNECTED_WALLET';
    mockActiveWallet.address = 'GCONNECTED_WALLET';

    const { result } = renderHook(() => useWalletBridge());

    await act(async () => {
      await result.current.disconnect();
    });

    expect(mockKit.disconnect).toHaveBeenCalled();
    expect(mockStore.disconnectWalletStore).toHaveBeenCalled();
    expect(result.current.isRegistered).toBe(false);
  });

  it('signs XDR transaction successfully', async () => {
    mockStore.address = 'GCONNECTED_WALLET';
    mockActiveWallet.address = 'GCONNECTED_WALLET';
    mockActiveWallet.walletType = 'freighter';
    (window as any).freighterApi = {};

    const { result } = renderHook(() => useWalletBridge());

    let signed = '';
    await act(async () => {
      signed = await result.current.sign('UNSIGNED_XDR');
    });

    expect(signed).toBe('SIGNED_TX_XDR_FREIGHTER');
  });

  it('throws WalletRejectedError when user rejects or cancels signature', async () => {
    mockStore.address = 'GCONNECTED_WALLET';
    mockActiveWallet.address = 'GCONNECTED_WALLET';
    mockActiveWallet.walletType = 'freighter';
    (window as any).freighterApi = {};
    mockSignTransaction.mockRejectedValueOnce(new Error('User declined to sign transaction'));

    const { result } = renderHook(() => useWalletBridge());

    await act(async () => {
      await expect(result.current.sign('UNSIGNED_XDR')).rejects.toThrow(WalletRejectedError);
    });
  });

  it('evaluates isRegistered as true when API returns matching primary wallet', async () => {
    const testAddr = 'GREGISTERED_PRIMARY_123';
    mockStore.address = testAddr;
    mockActiveWallet.address = testAddr;
    mockGetAuthenticatedApi.mockResolvedValueOnce({ primaryWallet: testAddr });

    const { result } = renderHook(() => useWalletBridge());

    // Wait for registration check effect
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetAuthenticatedApi).toHaveBeenCalledWith('/api/auth/sync-wallet');
    expect(result.current.isRegistered).toBe(true);
  });

  it('evaluates isRegistered as false when API returns a different primary wallet', async () => {
    const connectedAddr = 'GCONNECTED_SECONDARY_456';
    mockStore.address = connectedAddr;
    mockActiveWallet.address = connectedAddr;
    mockGetAuthenticatedApi.mockResolvedValueOnce({ primaryWallet: 'GDIFFERENT_PRIMARY_789' });

    const { result } = renderHook(() => useWalletBridge());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isRegistered).toBe(false);
  });
});
