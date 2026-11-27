// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const pollarState = vi.hoisted(() => ({
  configured: true,
  isAuthenticated: false,
  wallet: null as { address: string } | null,
  login: vi.fn(),
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

import { useGlobalAuthenticationStore } from "@/core/store/data";
import { PollarLoginButton } from "./PollarLoginButton";

describe("PollarLoginButton (#583)", () => {
  beforeEach(() => {
    pollarState.configured = true;
    pollarState.isAuthenticated = false;
    pollarState.wallet = null;
    pollarState.login.mockReset();
    useGlobalAuthenticationStore.setState({ token: null });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders nothing when the user has no Firebase session", () => {
    const { container } = render(<PollarLoginButton />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText(/Continue with Google/i)).toBeNull();
    expect(screen.queryByText(/Create a wallet with Pollar/i)).toBeNull();
  });

  it("renders nothing when Pollar is not configured", () => {
    pollarState.configured = false;
    useGlobalAuthenticationStore.setState({ token: "firebase-id-token" });

    const { container } = render(<PollarLoginButton />);
    expect(container.firstChild).toBeNull();
  });

  it('offers "Create a wallet with Pollar" after Firebase sign-in', () => {
    useGlobalAuthenticationStore.setState({ token: "firebase-id-token" });

    render(<PollarLoginButton />);
    expect(screen.getByRole("button", { name: /Create a wallet with Pollar/i })).toBeTruthy();
    expect(screen.queryByText(/Continue with Google/i)).toBeNull();
  });

  it("invokes onWalletReady and shows connected state when Pollar wallet is ready", () => {
    useGlobalAuthenticationStore.setState({ token: "firebase-id-token" });
    pollarState.isAuthenticated = true;
    pollarState.wallet = { address: "GABCDEF1234567890WXYZ" };
    const onWalletReady = vi.fn();

    render(<PollarLoginButton onWalletReady={onWalletReady} />);
    expect(onWalletReady).toHaveBeenCalledWith("GABCDEF1234567890WXYZ");
    expect(screen.getByText(/Pollar connected/i)).toBeTruthy();
  });
});
