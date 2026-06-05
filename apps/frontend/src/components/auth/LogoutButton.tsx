"use client";

import Cookies from "js-cookie";
import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useGlobalAuthenticationStore } from "@/core/store/data";
import { auth } from "@/lib/firebase";

export function LogoutButton() {
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
      disconnect();
      router.push("/login");
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start gap-2 text-gray-400 hover:bg-gray-800 hover:text-white"
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      <LogOut className="h-4 w-4" />
      {isLoggingOut ? "Logging out..." : "Logout"}
    </Button>
  );
}
