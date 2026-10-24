"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useGlobalAuthenticationStore } from "@/core/store/data";
import { SideBar } from "@/components/layouts/SideBar";
import { Header } from "@/components/layouts/Header";
import type { ReactNode } from "react";

const PUBLIC_ROUTES = [
  "/dashboard/hotel",
  "/dashboard/hotel/payment",
  "/dashboard/hotel/details",
  "/dashboard/hotel/search",
  "/dashboard/hotel/escrow",
  "/dashboard/hotel/create-escrow",
  "/dashboard/guest",
  "/dashboard/guest/suggestions",
];

const PUBLIC_ROUTE_PATTERNS = [
  /^\/dashboard\/hotel\/booking\/.+\/escrow$/,
];

const Layout = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();

  // ── Watch both auth signals ──────────────────────────
  const address = useGlobalAuthenticationStore((state) => state.address);
  const token = useGlobalAuthenticationStore((state) => state.token);

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthError, setIsAuthError] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route);
        const matchesPublicPattern = PUBLIC_ROUTE_PATTERNS.some((pattern) =>
          pattern.test(pathname)
        );
        const isPublic = isPublicRoute || matchesPublicPattern;

        const hasWalletInStorage =
          localStorage.getItem("walletAddress") ||
          localStorage.getItem("address-wallet");

        // ── Check address (wallet) OR token (Firebase email/password) ──
        const isAuthenticated = !!address || !!token || !!hasWalletInStorage;

        if (!isPublic && !isAuthenticated) {
          router.replace("/login?reason=unauthenticated");
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Authentication error:", error);
        setIsAuthError(true);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [address, token, pathname, router]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const isGuestRoute = pathname === "/dashboard/guest";
  if (isGuestRoute) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route);
  const matchesPublicPattern = PUBLIC_ROUTE_PATTERNS.some((pattern) =>
    pattern.test(pathname)
  );
  const isPublic = isPublicRoute || matchesPublicPattern;

  if (isAuthError && !isPublic) return null;

  return (
    <div className="flex h-full bg-gray-100 min-h-screen dark:bg-gray-950">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {pathname !== "/dashboard/profile" && (
        <SideBar
          variant="drawer"
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      )}

      {pathname !== "/dashboard/profile" && (
        <SideBar variant="permanent" notificationCount={1} />
      )}

      <main className={`flex-1 transition-all duration-300 min-h-[calc(100vh-4rem)] pt-16 ${pathname !== "/dashboard/profile" ? "md:ml-16 lg:ml-48" : ""}`}>
        <div className={`w-full h-full ${pathname !== "/dashboard/profile" ? "p-4 md:p-8 lg:p-10" : "p-4 md:p-6"}`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;