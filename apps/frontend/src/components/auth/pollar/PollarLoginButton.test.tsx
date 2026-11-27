// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const pollarState = vi.hoisted(() => ({
  configured: true,
  isAuthenticated: false,
  wallet: null as { address: string } | null,
  login: vi.fn(),
}));

const authState = vi.hoisted(() => ({
  user: null as { uid: string } | null,
  loading: false,
}));

vi.mock("@pollar/react", () => ({
  PollarProvider: ({ children }: { children: React.ReactNode }) => children,
  usePollar: () => ({
    isAuthenticated: pollarState.isAuthenticated,
    wallet: pollarState.wallet,
    login: pollarState.login,
  }),
}));

vi.mock("./PollarProvider", () => ({
  usePollarWallet: () => ({ configured: pollarState.configured }),
}));

vi.mock("@/components/auth/hooks/auth.hook", () => ({
  useAuthUser: () => authState,
}));

import { useGlobalAuthenticationStore } from "@/core/store/data";
import { PollarLoginButton } from "./PollarLoginButton";

describe("PollarLoginButton (#583)", () => {
  beforeEach(() => {
    pollarState.configured = true;
    pollarState.isAuthenticated = false;
    pollarState.wallet = null;
    pollarState.login.mockReset();
    authState.user = null;
    authState.loading = false;
    useGlobalAuthenticationStore.setState({ token: null, walletProvider: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing when the user has no live Firebase session", () => {
    // Even if a stale token remains in the persisted store, no live Firebase
    // user means Pollar must not be offered.
    useGlobalAuthenticationStore.setState({ token: "stale-token" });

    const { container } = render(<PollarLoginButton />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/Continue with Google/i)).toBeNull();
    expect(screen.queryByText(/Create a wallet with Pollar/i)).toBeNull();
  });

  it("renders nothing when Pollar is not configured", () => {
    pollarState.configured = false;
    authState.user = { uid: "firebase-uid-1" };

    const { container } = render(<PollarLoginButton />);
    expect(container.firstChild).toBeNull();
  });

  it('offers "Create a wallet with Pollar" and selects the Pollar provider before login', () => {
    authState.user = { uid: "firebase-uid-1" };

    render(<PollarLoginButton />);
    const button = screen.getByRole("button", { name: /Create a wallet with Pollar/i });
    expect(button).toBeTruthy();
    expect(screen.queryByText(/Continue with Google/i)).toBeNull();

    fireEvent.click(button);
    expect(useGlobalAuthenticationStore.getState().walletProvider).toBe("pollar");
    expect(pollarState.login).toHaveBeenCalledWith({ provider: "google" });
  });

  it("invokes onWalletReady and shows connected state when Pollar wallet is ready", () => {
    authState.user = { uid: "firebase-uid-1" };
    pollarState.isAuthenticated = true;
    pollarState.wallet = { address: "GABCDEF1234567890WXYZ" };
    const onWalletReady = vi.fn();

    render(<PollarLoginButton onWalletReady={onWalletReady} />);
    expect(onWalletReady).toHaveBeenCalledWith("GABCDEF1234567890WXYZ");
    expect(screen.getByText(/Pollar connected/i)).toBeTruthy();
  });
});
