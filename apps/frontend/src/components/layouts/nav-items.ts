import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Building2,
  Heart,
  Home,
  Hotel,
  LayoutDashboard,
  MessageSquare,
  PlusSquare,
  Shield,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  matches?: string[];
  badge?: "notifications" | "messages";
  /** Allowed roles: if omitted, available to all authenticated roles */
  roles?: string[];
};

export const ALL_NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard/escrow",
    label: "Escrows",
    icon: Shield,
  },
  {
    href: "/dashboard/escrow-dashboard",
    label: "Escrow Dashboard",
    icon: LayoutDashboard,
    roles: ["host", "admin"],
  },
  {
    href: "/dashboard/guest",
    label: "Guest view",
    icon: Home,
    roles: ["guest", "admin"],
  },
  {
    href: "/rent",
    label: "Rent",
    icon: Building2,
  },
  {
    href: "/dashboard/hotels",
    label: "Hotels",
    icon: Hotel,
    matches: ["/dashboard/hotels/"],
  },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    icon: Bell,
    badge: "notifications",
  },
  {
    href: "/dashboard/messages",
    label: "Messages",
    icon: MessageSquare,
    badge: "messages",
    matches: ["/dashboard/messages/"],
  },
  {
    href: "/dashboard/favorites",
    label: "Favorite",
    icon: Heart,
  },
  {
    href: "/dashboard/apartments",
    label: "Apartments",
    icon: Home,
    matches: ["/dashboard/apartments/"],
    roles: ["host", "admin"],
  },
  {
    href: "/dashboard/apartments/new",
    label: "New Apartment",
    icon: PlusSquare,
    roles: ["host", "admin"],
  },
  {
    href: "/dashboard/users",
    label: "Users",
    icon: Users,
    roles: ["admin"],
  },
];

export function getNavItemsForRole(activeRole: string | null): NavItem[] {
  const currentRole = activeRole || "guest";
  return ALL_NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(currentRole);
  });
}

export const isActive = (
  pathname: string,
  item: NavItem,
  items: NavItem[] = ALL_NAV_ITEMS,
) => {
  if (pathname === item.href) {
    return true;
  }
  const hasExactMatch = items.some((i) => i.href === pathname);
  if (hasExactMatch) {
    return false;
  }
  return (item.matches ?? []).some((p) => pathname.startsWith(p));
};
