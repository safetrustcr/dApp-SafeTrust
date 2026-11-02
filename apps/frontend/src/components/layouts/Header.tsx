"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchHeader } from "@/components/layouts/SearchHeader";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSessionView } from "@/lib/session/use-session-view";

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const router = useRouter();
  const { status, displayName, avatarUrl, activeRole, walletAddress } =
    useSessionView();

  const signedIn = status === "authenticated";

  const initials = displayName
    ? displayName
        .split(/\s+/)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : walletAddress
      ? (walletAddress.startsWith("0x")
          ? walletAddress.slice(2, 4)
          : walletAddress.slice(0, 2)
        ).toUpperCase()
      : "U";

  const formattedRole = activeRole
    ? activeRole.charAt(0).toUpperCase() + activeRole.slice(1).replace("_", " ")
    : null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm dark:border-b dark:border-gray-800 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex h-16 items-center gap-3 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={onMenuClick}
                aria-label="Toggle navigation menu"
              >
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>

              <Link
                href="/"
                className="flex min-w-0 shrink-0 items-center gap-2"
              >
                <Image
                  src="/img/logo.png"
                  alt="SafeTrust Logo"
                  width={40}
                  height={40}
                  priority
                  className="h-9 w-9 shrink-0 object-contain"
                />
                <span className="hidden truncate text-xl font-semibold text-gray-800 dark:text-white sm:block">
                  SafeTrust
                </span>
              </Link>
            </div>

            <div className="min-w-0 flex-1 max-w-2xl">
              <div className="hidden sm:block">
                <SearchHeader />
              </div>
              <Link
                href="/rent"
                aria-label="Browse rental properties"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-muted sm:hidden"
              >
                <Search aria-hidden="true" className="h-5 w-5" />
              </Link>
            </div>

            {/* Right: theme toggle | notifications | user / role / sign-in */}
            <div className="flex items-center gap-1 shrink-0 sm:gap-3">
              <div className="[&_svg]:hidden sm:[&_svg]:block">
                <ThemeToggle />
              </div>

              {signedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="hidden rounded-full px-2 py-1 text-sm font-medium text-gray-700 md:inline-flex transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Dashboard
                  </Link>

                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/notifications")}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/profile")}
                    className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full px-2 py-1 transition-colors"
                    aria-label="Go to profile"
                  >
                    <div className="hidden md:flex flex-col items-start leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          {displayName || "Account"}
                        </span>
                        {formattedRole && (
                          <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                            {formattedRole}
                          </span>
                        )}
                      </div>
                      {walletAddress && (
                        <span
                          data-testid="header-wallet-address"
                          title={walletAddress}
                          className="text-[11px] font-mono text-muted-foreground"
                        >
                          {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                        </span>
                      )}
                    </div>
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={displayName || "User avatar"}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-orange-800 dark:text-orange-200">
                          {initials}
                        </span>
                      </div>
                    )}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  {walletAddress && (
                    <span
                      data-testid="header-wallet-address"
                      title={walletAddress}
                      className="hidden sm:inline-block text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded"
                    >
                      {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                    </span>
                  )}
                  <Link
                    href="/login"
                    className="rounded-full bg-primary px-3.5 py-1.5 text-xs sm:text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Sign in
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* Spacer div to prevent content from being hidden under fixed header */}
      <div className="h-16" />
    </>
  );
};

export default Header;
