// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SideBar } from "../SideBar";
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

vi.mock("@/components/auth/hooks/auth.hook", () => ({
  useAuthUser: () => ({ user: { uid: "test-user-id" } }),
}));

vi.mock("@/components/messages/UnreadBadge", () => ({
  UnreadBadge: () => null,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/escrow",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("SideBar component role-based navigation", () => {
  beforeEach(() => {
    mockSession.current = {
      status: "authenticated",
      displayName: "Test User",
      avatarUrl: null,
      roles: ["guest"],
      activeRole: "guest",
      walletAddress: null,
    };
  });

  afterEach(cleanup);

  it("renders guest items and does not show host-only or admin-only items when activeRole is guest", () => {
    render(<SideBar variant="drawer" isOpen />);

    expect(screen.getByRole("link", { name: /Escrows/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /Rent/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /Guest view/ })).toBeDefined();

    // Guest should NOT see host items or admin items
    expect(screen.queryByRole("link", { name: /Escrow Dashboard/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /^Apartments/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /New Apartment/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Users/ })).toBeNull();
  });

  it("renders host items and hides guest-only view when activeRole is host", () => {
    mockSession.current = {
      status: "authenticated",
      displayName: "Host User",
      avatarUrl: null,
      roles: ["guest", "host"],
      activeRole: "host",
      walletAddress: null,
    };

    render(<SideBar variant="drawer" isOpen />);

    expect(screen.getByRole("link", { name: /Escrow Dashboard/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /^Apartments/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /New Apartment/ })).toBeDefined();

    // Host should NOT see Guest view or Admin Users
    expect(screen.queryByRole("link", { name: /Guest view/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Users/ })).toBeNull();
  });

  it("renders admin items when activeRole is admin", () => {
    mockSession.current = {
      status: "authenticated",
      displayName: "Admin User",
      avatarUrl: null,
      roles: ["admin"],
      activeRole: "admin",
      walletAddress: null,
    };

    render(<SideBar variant="drawer" isOpen />);

    expect(screen.getByRole("link", { name: /Users/ })).toBeDefined();
    expect(screen.getByRole("link", { name: /Escrow Dashboard/ })).toBeDefined();
  });
});
