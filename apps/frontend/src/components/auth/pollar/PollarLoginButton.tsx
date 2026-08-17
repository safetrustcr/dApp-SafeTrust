"use client";

import { useEffect, useState } from "react";
import { usePollar } from "@pollar/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePollarWallet } from "./PollarProvider";

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

  useEffect(() => {
    if (isAuthenticated && wallet?.address) {
      onWalletReady?.(wallet.address);
    }
  }, [isAuthenticated, wallet?.address, onWalletReady]);

  if (isAuthenticated && wallet?.address) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
        <span>Wallet ready</span>
        <span className="font-mono">
          {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
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
    <div className="flex w-full flex-col gap-3">
      <Button
        type="button"
        className="w-full bg-orange-500 hover:bg-orange-600"
        disabled={isBusy}
        onClick={() => void runLogin("google")}
      >
        Continue with Google - no crypto needed
      </Button>
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Email OTP"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isBusy}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isBusy || !email}
          onClick={() => void runLogin("email")}
        >
          Send code
        </Button>
      </div>
    </div>
  );
}
