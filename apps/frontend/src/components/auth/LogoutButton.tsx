"use client";

import Cookies from "js-cookie";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useGlobalAuthenticationStore } from "@/core/store/data";
import { auth } from "@/lib/firebase";

interface LogoutButtonProps {
  /**
   * "sidebar" — full-width, dark ghost style (existing behaviour, default)
   * "dropdown" — compact, light style for use inside a navbar dropdown
   */
  variant?: "sidebar" | "dropdown";
}

export function LogoutButton({ variant = "sidebar" }: LogoutButtonProps) {
  const router = useRouter();
  const disconnect = useGlobalAuthenticationStore((state) => state.disconnect);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await signOut(auth);
    } finally {
      Cookies.remove("firebase-token");
      Cookies.remove("auth-token");
      // Clear role cookie so middleware doesn't serve stale role on next login
      document.cookie = "user-role=; Max-Age=0; path=/";
      disconnect();
      router.push("/login");
      router.refresh();
    }
  };

  if (variant === "dropdown") {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
        {isLoggingOut ? "Logging out…" : "Logout"}
      </button>
    );
  }

  // Default: sidebar variant — preserves existing behaviour
  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {isLoggingOut ? "Logging out…" : "Logout"}
    </button>
  );
}