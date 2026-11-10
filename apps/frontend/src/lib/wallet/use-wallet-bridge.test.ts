/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// vi.mock factories are hoisted above these consts, so factories must read them lazily.
const mockFreighter = { address: null as string | null };
const mockPollar = { isAuthenticated: false, wallet: { address: null as string | null }, login: vi.fn() };
const mockStore = {
  address: null as string | null,
  walletType: null as string | null,
  stellarWalletId: null as string | null,
  walletProvider: null as string | null,
  selectWalletProvider: vi.fn((provider: string) => {
    mockStore.walletProvider = provider;
    mockStore.address = null;
    mockStore.walletType = null;
    mockStore.stellarWalletId = null;
  }),
  connectWalletStore: vi.fn((addr, name, id?: string, provider?: string) => {
    mockStore.address = addr;
    mockStore.walletType = name;
    mockStore.stellarWalletId = id ?? null;
    mockStore.walletProvider = provider ?? (id ? 'wallets-kit' : null);
  }),
  disconnectWalletStore: vi.fn(() => {
    mockStore.address = null;
    mockStore.walletType = null;
    mockStore.stellarWalletId = null;
    mockStore.walletProvider = null;
  }),
};
const mockKit = {
  disconnect: vi.fn(async () => {}),
  openModal: vi.fn(async () => {}),
  setWallet: vi.fn(async () => {}),
  getAddress: vi.fn(async () => ({ address: 'GKITWALLET123' })),
  signTransaction: vi.fn(async () => ({ signedTxXdr: 'SIGNED_TX_XDR_KIT' })),
};
const mockSignTransaction = vi.fn(async (..._args: unknown[]) => ({ signedTransaction: 'SIGNED_TX_XDR_FREIGHTER', signedTxXdr: 'SIGNED_TX_XDR_FREIGHTER' }));
const mockGetAuthenticatedApi = vi.fn();
const mockAuth = {
  currentUser: { uid: 'user-123', getIdToken: vi.fn(async () => 'mock-token') } as any,
};

vi.mock('@/hooks/use-freighter', () => ({
  useFreighter: () => mockFreighter,
}));

vi.mock('@/components/auth/pollar/PollarProvider', () => ({
  usePollarWallet: () => ({ address: mockPollar.isAuthenticated ? mockPollar.wallet.address : null, login: mockPollar.login }),
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
  get auth() {
    return mockAuth;
  },
}));

vi.mock('@stellar/freighter-api', () => ({
  signTransaction: (...args: any[]) => mockSignTransaction(...args),
}));

import { useWalletBridge, WalletRejectedError, PollarSigningUnsupportedError } from './use-wallet-bridge';

describe('useWalletBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFreighter.address = null;
    mockPollar.isAuthenticated = false;
    mockPollar.wallet = { address: null };
    mockStore.address = null;
    mockStore.walletType = null;
    mockStore.stellarWalletId = null;
    mockStore.walletProvider = null;
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

    const { result } = renderHook(() => useWalletBridge());
    expect(result.current.status).toBe('connected');
    expect(result.current.provider).toBe('freighter');
    expect(result.current.address).toBe(mockFreighter.address);
  });

  it('marks status connected when pollar address is present', () => {
    mockPollar.isAuthenticated = true;
    mockPollar.wallet = { address: 'GPOLLAR12345678901234567890123456789012345678901234' };

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

    const { result, rerender } = renderHook(() => useWalletBridge());
    await act(async () => { await result.current.connect('freighter'); });
    rerender();
    expect(result.current.provider).toBe('freighter');
    await result.current.sign('XDR', 'network');
    expect(mockSignTransaction).toHaveBeenCalledWith('XDR', { address: 'GFREIGHTER_PUBKEY', networkPassphrase: 'network' });
    expect(mockKit.signTransaction).not.toHaveBeenCalled();
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
    mockStore.walletType = 'freighter';
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
    mockStore.walletType = 'freighter';
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
    mockGetAuthenticatedApi.mockResolvedValueOnce({ primaryWallet: 'GDIFFERENT_PRIMARY_789' });

    const { result } = renderHook(() => useWalletBridge());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isRegistered).toBe(false);
  });

  it('signs with the selected Kit wallet even with Freighter installed and Pollar logged in', async () => {
    mockStore.address = 'GKIT';
    mockStore.walletType = 'xBull';
    mockStore.stellarWalletId = 'xbull';
    mockFreighter.address = 'GFREIGHTER';
    mockPollar.isAuthenticated = true;
    mockPollar.wallet.address = 'GPOLLAR';
    (window as any).freighterApi = {};
    const { result } = renderHook(() => useWalletBridge());
    expect(result.current.address).toBe('GKIT');
    expect(result.current.provider).toBe('wallets-kit');
    await expect(result.current.sign('XDR', 'test network')).resolves.toBe('SIGNED_TX_XDR_KIT');
    expect(mockKit.setWallet).toHaveBeenCalledWith('xbull');
    expect(mockKit.signTransaction).toHaveBeenCalledWith('XDR', { address: 'GKIT', networkPassphrase: 'test network' });
    expect(mockSignTransaction).not.toHaveBeenCalled();
  });

  it('rejects Pollar without calling either signing SDK, even with other wallets connected', async () => {
    mockPollar.isAuthenticated = true;
    mockPollar.wallet.address = 'GPOLLAR';
    mockFreighter.address = 'GFREIGHTER';
    (window as any).freighterApi = {};
    const { result } = renderHook(() => useWalletBridge());
    expect(result.current.provider).toBe('pollar');
    await expect(result.current.sign('XDR')).rejects.toThrow(PollarSigningUnsupportedError);
    expect(mockSignTransaction).not.toHaveBeenCalled();
    expect(mockKit.signTransaction).not.toHaveBeenCalled();
  });

  it('does not fall back from a stored Pollar selection to an available Kit wallet', async () => {
    mockStore.address = 'GPOLLAR';
    mockStore.walletType = 'Pollar';
    mockStore.stellarWalletId = 'freighter';
    const { result } = renderHook(() => useWalletBridge());
    await expect(result.current.sign('XDR')).rejects.toThrow(PollarSigningUnsupportedError);
    expect(mockKit.setWallet).not.toHaveBeenCalled();
    expect(mockKit.signTransaction).not.toHaveBeenCalled();
    expect(mockSignTransaction).not.toHaveBeenCalled();
  });

  it('rejects unknown stored providers without falling back to Freighter', async () => {
    mockStore.address = 'GUNKNOWN';
    mockStore.walletType = 'unknown';
    mockFreighter.address = 'GFREIGHTER';
    const { result } = renderHook(() => useWalletBridge());
    await expect(result.current.sign('XDR')).rejects.toThrow('No supported wallet');
    expect(mockSignTransaction).not.toHaveBeenCalled();
    expect(mockKit.signTransaction).not.toHaveBeenCalled();
  });

  it('replaces a Kit selection when asynchronous Pollar login completes', async () => {
    Object.assign(mockStore, { address: 'GKIT', walletType: 'xBull', stellarWalletId: 'xbull', walletProvider: 'wallets-kit' });
    mockFreighter.address = 'GFREIGHTER';
    const { result, rerender } = renderHook(() => useWalletBridge());
    await act(async () => { await result.current.connect('pollar'); });
    rerender();
    expect(result.current.address).toBeUndefined();
    await expect(result.current.sign('XDR')).rejects.toThrow();
    mockPollar.isAuthenticated = true;
    mockPollar.wallet.address = 'GPOLLAR';
    rerender();
    expect(result.current.provider).toBe('pollar');
    expect(result.current.address).toBe('GPOLLAR');
    expect(mockStore.stellarWalletId).toBeNull();
    await expect(result.current.sign('XDR')).rejects.toThrow(PollarSigningUnsupportedError);
    expect(mockKit.signTransaction).not.toHaveBeenCalled();
    expect(mockSignTransaction).not.toHaveBeenCalled();
  });

  it('keeps Freighter selected through the Kit on the Kit adapter', async () => {
    Object.assign(mockStore, { address: 'GKIT', walletType: 'Freighter', stellarWalletId: 'freighter', walletProvider: 'wallets-kit' });
    const { result } = renderHook(() => useWalletBridge());
    await result.current.sign('XDR', 'network');
    expect(result.current.provider).toBe('wallets-kit');
    expect(mockKit.setWallet).toHaveBeenCalledWith('freighter');
    expect(mockKit.signTransaction).toHaveBeenCalled();
    expect(mockSignTransaction).not.toHaveBeenCalled();
  });

  it('does not let a delayed Pollar login overwrite a later Kit connection', async () => {
    Object.assign(mockStore, { address: 'GKIT', walletType: 'xBull', stellarWalletId: 'xbull', walletProvider: 'wallets-kit' });
    mockPollar.isAuthenticated = true;
    mockPollar.wallet.address = 'GPOLLAR';
    const { result } = renderHook(() => useWalletBridge());
    expect(result.current.address).toBe('GKIT');
    expect(mockStore.connectWalletStore).not.toHaveBeenCalled();
    await result.current.sign('XDR', 'API_NETWORK');
    expect(mockKit.signTransaction).toHaveBeenCalledWith('XDR', { address: 'GKIT', networkPassphrase: 'API_NETWORK' });
  });

  it('normalizes a public network label for callers without API metadata', async () => {
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'PUBLIC');
    Object.assign(mockStore, { address: 'GFREIGHTER', walletType: 'Freighter', walletProvider: 'freighter' });
    const { result } = renderHook(() => useWalletBridge());
    await result.current.sign('XDR');
    expect(mockSignTransaction).toHaveBeenCalledWith('XDR', { address: 'GFREIGHTER', networkPassphrase: 'Public Global Stellar Network ; September 2015' });
    vi.unstubAllEnvs();
  });
});
