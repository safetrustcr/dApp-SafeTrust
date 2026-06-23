"use client";

import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/auth/LogoutButton";
//import { Bell, Heart, LayoutDashboard, Shield, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
// Add to imports at the top:
import { Bell, Heart, Home, LayoutDashboard, PlusSquare, Shield, Users } from "lucide-react";

interface SideBarProps {
  className?: string;
  notificationCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
  variant?: "drawer" | "permanent";
}

export function SideBar({
  className,
  notificationCount = 0,
  isOpen,
  onClose,
  variant = "permanent",
}: SideBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className={cn(
        "fixed top-16 flex flex-col h-[calc(100vh-4rem)] bg-background border-r transition-all duration-300 z-40 dark:bg-gray-900 dark:border-gray-700",
        variant === "drawer"
          ? cn(
              "left-0 w-64 md:hidden transform",
              isOpen ? "translate-x-0" : "-translate-x-full",
            )
          : "hidden md:flex md:w-16 lg:w-48 left-0",
        className,
      )}
    >
      <div className="flex h-full flex-col items-start gap-4 py-4 px-2 lg:px-4">
        <Link
          href="/dashboard/escrow"
          onClick={onClose}
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 w-full dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
            pathname === "/dashboard/escrow"
              ? "bg-accent text-accent-foreground dark:bg-gray-800 dark:text-white"
              : "hover:bg-accent",
          )}
        >
          <Shield className="w-6 h-6 dark:text-gray-400" />
          <span>Escrows</span>
        </Link>
        <Link
          href="/dashboard/escrow-dashboard"
          onClick={onClose}
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors duration-200 w-full group relative dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
            pathname === "/dashboard/escrow-dashboard" &&
              "bg-accent font-medium dark:bg-gray-800 dark:text-white",
          )}
        >
          <Shield className="w-6 h-6 dark:text-gray-400" />
          <span className="md:hidden lg:block">Escrow Dashboard</span>
          <span className="hidden md:group-hover:block lg:group-hover:hidden absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded shadow-md text-xs z-50 whitespace-nowrap">
            Escrow Dashboard
          </span>
        </Link>
        <Link
          href="/dashboard/notifications"
          onClick={onClose}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors duration-200 w-full relative group dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <Bell className="w-6 h-6 shrink-0 dark:text-gray-400" />
          <span className="md:hidden lg:block">Notifications</span>
          {notificationCount > 0 && (
            <div className="absolute right-2 bg-blue-500 text-white rounded-full min-w-[18px] h-4.5 flex items-center justify-center text-[10px] font-bold px-1 dark:bg-blue-600">
              {notificationCount}
            </div>
          )}
          {/* Tooltip for rail mode */}
          <span className="hidden md:group-hover:block lg:group-hover:hidden absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded shadow-md text-xs z-50 whitespace-nowrap">
            Notifications
          </span>
        </Link>
        <Link
          href="/dashboard/favorites"
          onClick={onClose}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors duration-200 w-full group relative dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <Heart className="w-6 h-6 shrink-0 dark:text-gray-400" />
          <span className="md:hidden lg:block">Favorite</span>
          {/* Tooltip for rail mode */}
          <span className="hidden md:group-hover:block lg:group-hover:hidden absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded shadow-md text-xs z-50 whitespace-nowrap">
            Favorite
          </span>
        </Link>
        <button
          onClick={() => router.push("/dashboard/guest")}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white transition-colors duration-200 w-full group relative"
        >
          <LayoutDashboard className="w-6 h-6 shrink-0" />
          <span className="md:hidden lg:block">Guest view</span>
          {/* Tooltip for rail mode */}
          <span className="hidden md:group-hover:block lg:group-hover:hidden absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded shadow-md text-xs z-50 whitespace-nowrap">
            Guest view
          </span>
        </button>
        <Link
          href="/dashboard/users"
          onClick={onClose}
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors duration-200 w-full dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white",
            pathname === "/dashboard/users" &&
              "bg-accent font-medium dark:bg-gray-800 dark:text-white",
          )}
        >
          <Users className="w-6 h-6 dark:text-gray-400" />
          <span>Users</span>
        </Link>

        <Link
            href="/dashboard/apartments"
            onClick={onClose}
            className={cn(
                "flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors duration-200 w-full dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white group relative",
                    pathname === "/dashboard/apartments" &&
                      "bg-accent font-medium dark:bg-gray-800 dark:text-white",
                  )}
            >
              <Home className="w-6 h-6 dark:text-gray-400 shrink-0" />
                  <span className="md:hidden lg:block">Apartments</span>
                  <span className="hidden md:group-hover:block lg:group-hover:hidden absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded shadow-md text-xs z-50 whitespace-nowrap">
                    Apartments
                  </span>
              </Link>

              <Link
                  href="/dashboard/apartments/new"
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors duration-200 w-full dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white group relative",
                    pathname === "/dashboard/apartments/new" &&
                      "bg-accent font-medium dark:bg-gray-800 dark:text-white",
                  )}
              >
              <PlusSquare className="w-6 h-6 dark:text-gray-400 shrink-0" />
                  <span className="md:hidden lg:block">New Apartment</span>
                  <span className="hidden md:group-hover:block lg:group-hover:hidden absolute left-14 bg-popover text-popover-foreground px-2 py-1 rounded shadow-md text-xs z-50 whitespace-nowrap">
                    New Apartment
                  </span>
              </Link>

        <div className="mt-auto w-full pt-4">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
