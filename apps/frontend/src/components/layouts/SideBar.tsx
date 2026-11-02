"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { UnreadBadge } from "@/components/messages/UnreadBadge";
import { useSessionView } from "@/lib/session/use-session-view";
import { useAuthUser } from "@/components/auth/hooks/auth.hook";
import { getNavItemsForRole, isActive } from "./nav-items";

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
  const { activeRole } = useSessionView();
  const { user } = useAuthUser();

  const navItems = getNavItemsForRole(activeRole);

  return (
    <div
      className={cn(
        "fixed top-16 flex flex-col h-[calc(100vh-4rem)] bg-background border-r motion-safe:transition-transform motion-safe:duration-300 z-40 dark:bg-gray-900 dark:border-gray-700",
        variant === "drawer"
          ? cn(
              "left-0 w-64 md:hidden transform",
              isOpen ? "translate-x-0" : "-translate-x-full",
            )
          : "hidden md:flex md:w-16 lg:w-48 left-0",
        className,
      )}
    >
      <div className="flex flex-1 flex-col overflow-y-auto scrollbar-scroball">
        <nav aria-label="Dashboard" className="flex flex-1 flex-col gap-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item, navItems);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-lg p-2 transition-colors duration-200 bg-sky-50/70 hover:bg-accent hover:text-accent-foreground dark:bg-transparent dark:text-gray-300 dark:hover:bg-accent dark:hover:text-accent-foreground",
                  active &&
                    "bg-accent text-accent-foreground ring-1 ring-sky-300 dark:bg-accent dark:text-accent-foreground dark:ring-sky-700 font-medium",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="md:hidden lg:block">{item.label}</span>
                <span className="absolute left-14 z-50 hidden whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md md:group-hover:block lg:group-hover:hidden">
                  {item.label}
                </span>
                {item.badge === "messages" && user?.uid && (
                  <UnreadBadge userId={user.uid} />
                )}
                {item.badge === "notifications" && notificationCount > 0 && (
                  <div className="absolute right-2 bg-blue-500 text-white rounded-full min-w-[18px] h-4.5 flex items-center justify-center text-[10px] font-bold px-1 dark:bg-blue-600">
                    {notificationCount}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto w-full px-2 pb-4 pt-4 lg:px-4">
        <LogoutButton />
      </div>
    </div>
  );
}

export default SideBar;
