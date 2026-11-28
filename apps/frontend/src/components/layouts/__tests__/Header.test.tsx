// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Header } from "../Header";
import type { SessionView } from "@/lib/session/use-session-view";

const mockSession: { current: SessionView } = {
  current: {
    status: "unauthenticated",
    displayName: null,
    avatarUrl: null,
    roles: [],
    activeRole: null,
    walletAddress: null,
  },
};

vi.mock("@/lib/session/use-session-view", () => ({
  useSessionView: () => mockSession.current,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

describe("Header component", () => {
  beforeEach(() => {
    mockSession.current = {
      status: "unauthenticated",
      displayName: null,
      avatarUrl: null,
      roles: [],
      activeRole: null,
      walletAddress: null,
    };
  });

  afterEach(cleanup);

  it("renders 'Sign in' when user is signed out without fixture names", () => {
    render(<Header />);

    expect(screen.getByRole("link", { name: "Sign in" })).toBeDefined();
    expect(screen.queryByText("Admin")).toBeNull();
    expect(screen.queryByText("Demo")).toBeNull();
  });

  it("renders real signed-in user name, active role, and wallet address when authenticated", () => {
    mockSession.current = {
      status: "authenticated",
      displayName: "Sofia Morales",
      avatarUrl: null,
      roles: ["guest", "host"],
      activeRole: "host",
      walletAddress: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    };

    render(<Header />);

    expect(screen.getByText("Sofia Morales")).toBeDefined();
    expect(screen.getByText("Host")).toBeDefined();
    expect(screen.getByText("GBBD47…FLA5")).toBeDefined();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });
});
