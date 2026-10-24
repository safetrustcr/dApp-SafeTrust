"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import Cookies from "js-cookie";
import { auth } from "@/lib/firebase";
import { useGlobalAuthenticationStore } from "@/core/store/data";
import { ROLE_COOKIE, resolveHighestRole } from "@/lib/middleware/roles";
import { HASURA_CLAIMS_NAMESPACE } from "@/lib/hotel-access";

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export interface SessionView {
  status: SessionStatus;
  displayName: string | null;
  avatarUrl: string | null;
  roles: string[];
  activeRole: string | null;
  walletAddress: string | null;
}

function extractRoles(claims: Record<string, unknown> | undefined, cookieRole?: string): string[] {
  const rolesSet = new Set<string>();

  if (cookieRole) {
    rolesSet.add(cookieRole);
  }

  const hasura = claims?.[HASURA_CLAIMS_NAMESPACE] as
    | { "x-hasura-allowed-roles"?: string[]; "x-hasura-default-role"?: string }
    | undefined;

  if (Array.isArray(hasura?.["x-hasura-allowed-roles"])) {
    for (const r of hasura["x-hasura-allowed-roles"]) {
      if (typeof r === "string" && r.trim()) rolesSet.add(r.trim());
    }
  }

  if (typeof hasura?.["x-hasura-default-role"] === "string") {
    rolesSet.add(hasura["x-hasura-default-role"].trim());
  }

  if (Array.isArray(claims?.roles)) {
    for (const r of claims.roles) {
      if (typeof r === "string" && r.trim()) rolesSet.add(r.trim());
    }
  }

  if (typeof claims?.role === "string" && claims.role.trim()) {
    rolesSet.add(claims.role.trim());
  }

  if (rolesSet.size === 0) {
    rolesSet.add("guest");
  }

  return Array.from(rolesSet);
}

function determineActiveRole(roles: string[]): string {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("manager") || roles.includes("hotel_manager")) return "manager";
  if (roles.includes("host")) return "host";
  if (roles.includes("hotel_staff")) return "hotel_staff";
  return resolveHighestRole(roles);
}

export function buildSessionView(
  user: User | null,
  walletAddress: string | null,
  claims?: Record<string, unknown>,
  cookieRole?: string
): SessionView {
  if (!user) {
    return {
      status: "unauthenticated",
      displayName: null,
      avatarUrl: null,
      roles: [],
      activeRole: null,
      walletAddress: walletAddress || null,
    };
  }

  const roles = extractRoles(claims, cookieRole);
  const activeRole = determineActiveRole(roles);
  const displayName =
    user.displayName?.trim() ||
    user.email?.split("@")[0] ||
    null;

  return {
    status: "authenticated",
    displayName,
    avatarUrl: user.photoURL || null,
    roles,
    activeRole,
    walletAddress: walletAddress || null,
  };
}

export function useSessionView(): SessionView {
  const storeAddress = useGlobalAuthenticationStore((state) => state.address);
  const [session, setSession] = useState<SessionView>({
    status: "loading",
    displayName: null,
    avatarUrl: null,
    roles: [],
    activeRole: null,
    walletAddress: storeAddress || null,
  });

  useEffect(() => {
    let active = true;

    const getStoredWallet = (): string | null => {
      if (storeAddress) return storeAddress;
      if (typeof window === "undefined") return null;
      try {
        return (
          localStorage.getItem("walletAddress") ||
          localStorage.getItem("address-wallet") ||
          null
        );
      } catch {
        return null;
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const currentWallet = getStoredWallet();

      if (!firebaseUser) {
        if (active) {
          setSession(buildSessionView(null, currentWallet));
        }
        return;
      }

      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        const cookieRole = Cookies.get(ROLE_COOKIE);
        if (active) {
          setSession(
            buildSessionView(
              firebaseUser,
              currentWallet,
              tokenResult.claims,
              cookieRole
            )
          );
        }
      } catch {
        if (active) {
          const cookieRole = Cookies.get(ROLE_COOKIE);
          setSession(buildSessionView(firebaseUser, currentWallet, undefined, cookieRole));
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [storeAddress]);

  return session;
}
