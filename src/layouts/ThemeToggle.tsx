"use client";

import { useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWallet } from "@/components/auth/hooks/useWallet.hook";
import { useGlobalAuthenticationStore } from "@/components/auth/store/data";
import { Button } from "@/components/ui/button";
import { Bell, Sun, Moon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useGlobalAuthenticationStore();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = window.document.documentElement;
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <button type="button" className="w-auto h-auto" onClick={() => toggleTheme()}>
      {theme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-600" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      )}
    </button>
  );
};

export function DashboardHeader() {
  const isMobile = useIsMobile();
  const address = useGlobalAuthenticationStore((state) => state.address);
  const { handleDisconnect } = useWallet();

  return (
    <header className="flex h-16 items-center justify-between border-b px-4 lg:px-6">
      <SidebarTrigger
        className={cn("h-10 w-10 p-3 z-0", isMobile ? "left-0" : "relative")}
      />
      <div className="flex items-center gap-4 ml-auto">
        <ThemeToggle />
        <Button variant="ghost" size="icon">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Notifications</span>
        </Button>

        {address && (
          <Button
            onClick={handleDisconnect}
            type="button"
            className="w-full text-white bg-gradient-to-br from-blue-600 to-blue-800 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-200 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mt-2"
          >
            Disconnect
          </Button>
        )}
      </div>
    </header>
  );
}
