"use client";

import { useEffect, useState } from "react";
import { usePollar } from "@pollar/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePollarWallet } from "./PollarProvider";
import { GoogleIcon } from "@/components/auth/ui/GoogleIcon";
import { Loader2, Mail } from "lucide-react";

type PollarLoginButtonProps = {
  onWalletReady?: (address: string) => void;
};

export function PollarLoginButton({ onWalletReady }: PollarLoginButtonProps) {
  const { configured } = usePollarWallet();
  if (!configured) {
    return null;
  }

  return <PollarLoginButtonInner onWalletReady={onWalletReady} />;
}

function PollarLoginButtonInner({ onWalletReady }: PollarLoginButtonProps) {
  const { isAuthenticated, wallet, login } = usePollar();
  const [email, setEmail] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);

  useEffect(() => {
    if (isAuthenticated && wallet?.address) {
      onWalletReady?.(wallet.address);
    }
  }, [isAuthenticated, wallet?.address, onWalletReady]);

  if (isAuthenticated && wallet?.address) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-300/80 bg-emerald-50/70 p-3 text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100 font-bold">
          ✓
        </span>
        <span className="truncate">
          Pollar connected — {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
        </span>
      </div>
    );
  }

  const runLogin = async (provider: "google" | "email") => {
    setIsBusy(true);
    try {
      if (provider === "email") {
        await login({ provider: "email", email });
      } else {
        await login({ provider: "google" });
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2.5">
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full rounded-xl border-zinc-200 bg-white font-medium text-zinc-800 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        disabled={isBusy}
        onClick={() => void runLogin("google")}
      >
        {isBusy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="mr-2 h-4 w-4" />
        )}
        <span>Continue with Google</span>
      </Button>

      {showEmailInput ? (
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isBusy}
            className="h-10 rounded-xl bg-muted/50 dark:bg-zinc-800/80"
          />
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-xl px-4 font-medium"
            disabled={isBusy || !email}
            onClick={() => void runLogin("email")}
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowEmailInput(true)}
          className="flex items-center justify-center gap-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Mail className="h-3 w-3" />
          <span>Or sign in with email OTP</span>
        </button>
      )}
    </div>
  );
}
