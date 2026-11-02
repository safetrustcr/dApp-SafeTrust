// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { User } from "firebase/auth";
import { buildSessionView } from "./use-session-view";
import { HASURA_CLAIMS_NAMESPACE } from "@/lib/hotel-access";

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    uid: "test-user-123",
    email: "user@safetrust.cr",
    displayName: "Elena Rostova",
    photoURL: "https://example.com/avatar.jpg",
    getIdTokenResult: () =>
      Promise.resolve({
        claims: {},
        token: "token",
        authTime: "now",
        issuedAtTime: "now",
        expirationTime: "later",
        signInProvider: "password",
        signInSecondFactor: null,
      }),
    ...overrides,
  } as unknown as User;
}

describe("use-session-view / buildSessionView", () => {
  describe("signed out", () => {
    it("returns unauthenticated without wallet", () => {
      const view = buildSessionView(null, null);
      expect(view).toEqual({
        status: "unauthenticated",
        displayName: null,
        avatarUrl: null,
        roles: [],
        activeRole: null,
        walletAddress: null,
      });
    });

    it("returns unauthenticated with linked wallet", () => {
      const wallet = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
      const view = buildSessionView(null, wallet);
      expect(view).toEqual({
        status: "unauthenticated",
        displayName: null,
        avatarUrl: null,
        roles: [],
        activeRole: null,
        walletAddress: wallet,
      });
    });
  });

  describe("guest", () => {
    it("resolves default guest role when no claims or cookie exist (wallet not linked)", () => {
      const user = createMockUser({ displayName: "John Guest" });
      const view = buildSessionView(user, null);

      expect(view.status).toBe("authenticated");
      expect(view.displayName).toBe("John Guest");
      expect(view.avatarUrl).toBe("https://example.com/avatar.jpg");
      expect(view.roles).toEqual(["guest"]);
      expect(view.activeRole).toBe("guest");
      expect(view.walletAddress).toBeNull();
    });

    it("resolves guest role with linked wallet", () => {
      const user = createMockUser({ displayName: null, email: "guest@safetrust.cr" });
      const wallet = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
      const view = buildSessionView(user, wallet, undefined, "guest");

      expect(view.status).toBe("authenticated");
      expect(view.displayName).toBe("guest");
      expect(view.roles).toContain("guest");
      expect(view.activeRole).toBe("guest");
      expect(view.walletAddress).toBe(wallet);
    });
  });

  describe("host", () => {
    it("resolves host role from cookie when wallet is not linked", () => {
      const user = createMockUser();
      const view = buildSessionView(user, null, undefined, "host");

      expect(view.status).toBe("authenticated");
      expect(view.roles).toContain("host");
      expect(view.activeRole).toBe("host");
      expect(view.walletAddress).toBeNull();
    });

    it("resolves host role from Hasura claims with linked wallet", () => {
      const user = createMockUser();
      const wallet = "GCXKG6RN4ONIEPCMNFB732A436Z5PNDSRLGHD7IWIOVOQJGLY2RHIFOH";
      const claims = {
        [HASURA_CLAIMS_NAMESPACE]: {
          "x-hasura-allowed-roles": ["guest", "host"],
          "x-hasura-default-role": "host",
        },
      };

      const view = buildSessionView(user, wallet, claims);

      expect(view.status).toBe("authenticated");
      expect(view.roles).toContain("host");
      expect(view.roles).toContain("guest");
      expect(view.activeRole).toBe("host");
      expect(view.walletAddress).toBe(wallet);
    });
  });

  describe("manager", () => {
    it("resolves manager role from hotel_manager claims (wallet not linked)", () => {
      const user = createMockUser({ displayName: "Hotel Manager" });
      const claims = {
        [HASURA_CLAIMS_NAMESPACE]: {
          "x-hasura-allowed-roles": ["guest", "hotel_manager"],
        },
      };

      const view = buildSessionView(user, null, claims);

      expect(view.status).toBe("authenticated");
      expect(view.displayName).toBe("Hotel Manager");
      expect(view.roles).toContain("hotel_manager");
      expect(view.activeRole).toBe("manager");
      expect(view.walletAddress).toBeNull();
    });

    it("resolves manager role from explicit manager claim with linked wallet", () => {
      const user = createMockUser();
      const wallet = "GAA456...";
      const claims = {
        roles: ["guest", "manager"],
      };

      const view = buildSessionView(user, wallet, claims);

      expect(view.status).toBe("authenticated");
      expect(view.roles).toContain("manager");
      expect(view.activeRole).toBe("manager");
      expect(view.walletAddress).toBe(wallet);
    });
  });
});
