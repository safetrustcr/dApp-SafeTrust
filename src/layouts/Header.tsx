"use client";

import { useWallet } from "@/components/auth/hooks/useWallet.hook";
import { useGlobalAuthenticationStore } from "@/components/auth/store/data";
import { Button } from "@/components/ui/button";
import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function DashboardHeader() {
  const { theme, setTheme } = useTheme();
  const address = useGlobalAuthenticationStore((state) => state.address);
    const { handleDisconnect } = useWallet();

  return (
    <header className="flex h-16 items-center justify-between border-b px-4 lg:px-6">
      <div className="flex items-center gap-4" />
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notifications</span>
        </Button>

        {address && (
          <Button onClick={handleDisconnect} type="button"  className="w-full text-white bg-gradient-to-br from-blue-600 to-blue-800 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-200 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center mt-2">
            Disconnect
          </Button>
        )}
      </div>
    </header>
  );
}
