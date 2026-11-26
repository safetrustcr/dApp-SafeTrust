// @vitest-environment jsdom
/**
 * #587: logging out of SafeTrust must end the Pollar session, so the next
 * Firebase user on the same device is never offered the previous user's
 * Pollar wallet for signing.
 *
 * Real LogoutButton, PollarProvider, useWalletBridge and auth store; the
 * Pollar SDK is replaced by a small stateful fake with the same surface
 * (wallet / isAuthenticated / login / logout).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const USER_A_POLLAR = 'GUSERAPOLLARWALLETAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const USER_C_POLLAR = 'GUSERCPOLLARWALLETCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC';

const sdk = vi.hoisted(() => {
  let wallet: { address: string } | null = null;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  return {
    getWallet: () => wallet,
    setWallet(next: { address: string } | null) {
      wallet = next;
      emit();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    // Like PollarClient.logout(): revoke server-side, then clear the session.
    logout: vi.fn(async () => {
      wallet = null;
      emit();
    }),
    login: vi.fn(),
  };
});

const firebase = vi.hoisted(() => ({
  auth: { currentUser: null as null | { uid: string; getIdToken: () => Promise<string> } },
  signOut: vi.fn(async () => {}),
}));

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock('@pollar/react', async () => {
  const React = await import('react');
  return {
    PollarProvider: ({ children }: { children: React.ReactNode }) => children,
    usePollar: () => {
      const wallet = React.useSyncExternalStore(sdk.subscribe, sdk.getWallet, sdk.getWallet);
      return {
        wallet,
        isAuthenticated: Boolean(wallet),
        login: sdk.login,
        logout: () => sdk.logout(),
        signAndSubmitTx: vi.fn(),
      };
    },
  };
});
vi.mock('firebase/auth', () => ({
  signOut: (...args: unknown[]) => firebase.signOut(...(args as [])),
}));
vi.mock('@/lib/firebase', () => ({
  get auth() {
    return firebase.auth;
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('js-cookie', () => ({ default: { remove: vi.fn() } }));
vi.mock('@/lib/push', () => ({ disablePush: vi.fn(async () => {}) }));
vi.mock('@/hooks/use-freighter', () => ({ useFreighter: () => ({ address: null }) }));
vi.mock('@/components/auth/wallet/constants/wallet-kit.constant', () => ({
  getWalletKit: () => ({ disconnect: vi.fn(async () => {}), setWallet: vi.fn(), signTransaction: vi.fn() }),
}));
vi.mock('@/lib/api/client', () => ({
  getAuthenticatedApi: vi.fn(async () => ({ primaryWallet: null })),
}));
vi.mock('@stellar/freighter-api', () => ({ signTransaction: vi.fn() }));

import { usePollar } from '@pollar/react';
import { LogoutButton } from './LogoutButton';
import { PollarProvider, POLLAR_LOGOUT_TIMEOUT_MS } from './pollar/PollarProvider';
import { useWalletBridge, type WalletBridge } from '@/lib/wallet/use-wallet-bridge';
import { useGlobalAuthenticationStore } from '@/core/store/data';

const firebaseUser = (uid: string) => ({ uid, getIdToken: async () => `token-${uid}` });

let bridge: WalletBridge;

function SigningProbe() {
  bridge = useWalletBridge();
  const pollar = usePollar();
  return (
    <>
      <output data-testid="signer">{bridge.address ?? 'none'}</output>
      <output data-testid="pollar-authenticated">{String(pollar.isAuthenticated)}</output>
      <output data-testid="pollar-wallet">{pollar.wallet?.address ?? 'null'}</output>
    </>
  );
}

function renderApp() {
  return render(
    <PollarProvider>
      <LogoutButton />
      <SigningProbe />
    </PollarProvider>,
  );
}

/** User A is signed in with Firebase and has Pollar selected as their wallet. */
function signInUserAWithPollar() {
  firebase.auth.currentUser = firebaseUser('user-a');
  sdk.setWallet({ address: USER_A_POLLAR });
  useGlobalAuthenticationStore.getState().connectWalletStore(USER_A_POLLAR, 'Pollar', undefined, 'pollar');
}

const signer = () => screen.getByTestId('signer').textContent;

describe('LogoutButton ends the Pollar session (#587)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY', 'pk_test_safetrust');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    firebase.signOut.mockImplementation(async () => {
      firebase.auth.currentUser = null;
    });
    sdk.setWallet(null);
    useGlobalAuthenticationStore.getState().disconnect();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('log out → sign in as a different Firebase user → no Pollar address is offered for signing', async () => {
    signInUserAWithPollar();
    const { rerender } = renderApp();
    expect(signer()).toBe(USER_A_POLLAR);

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/login'));

    expect(sdk.logout).toHaveBeenCalledTimes(1);
    expect(firebase.signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('pollar-authenticated').textContent).toBe('false');
    expect(screen.getByTestId('pollar-wallet').textContent).toBe('null');
    expect(signer()).toBe('none');

    // User B signs in with email/password on the same device.
    firebase.auth.currentUser = firebaseUser('user-b');
    rerender(
      <PollarProvider>
        <LogoutButton />
        <SigningProbe />
      </PollarProvider>,
    );

    expect(signer()).toBe('none');
    expect(bridge.provider).toBeUndefined();
    await expect(bridge.sign('AAAA-unsigned-xdr')).rejects.toThrow(/No supported wallet connected/);
  });

  it('a failing Pollar logout does not block Firebase sign-out, and the old address stays hidden', async () => {
    sdk.logout.mockImplementationOnce(async () => {
      throw new Error('Pollar API unreachable');
    });
    signInUserAWithPollar();
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/login'));

    expect(firebase.signOut).toHaveBeenCalledTimes(1);
    // The SDK still holds user A's session, but it is never offered for signing.
    expect(screen.getByTestId('pollar-wallet').textContent).toBe(USER_A_POLLAR);
    expect(signer()).toBe('none');

    // Once the SDK does clear the session, a later Pollar login is offered again.
    act(() => sdk.setWallet(null));
    act(() => sdk.setWallet({ address: USER_C_POLLAR }));
    expect(signer()).toBe(USER_C_POLLAR);
  });

  it('a hanging Pollar logout is capped so logout still redirects', async () => {
    vi.useFakeTimers();
    sdk.logout.mockImplementationOnce(() => new Promise<void>(() => {}));
    signInUserAWithPollar();
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLLAR_LOGOUT_TIMEOUT_MS - 1);
    });
    expect(firebase.signOut).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(router.push).toHaveBeenCalledWith('/login');
    expect(signer()).toBe('none');
  });
});
