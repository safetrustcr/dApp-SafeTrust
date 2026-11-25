"use client";

import { useEffect, useState } from "react";
import { usePollar } from "@pollar/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePollarWallet } from "./PollarProvider";
import { GoogleIcon } from "@/components/auth/ui/GoogleIcon";
import { Loader2, Mail, RefreshCw } from "lucide-react";

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
  const { isAuthenticated, wallet, login, step, verifyEmailCode, error } =
    usePollar();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [showEmailInput, setShowEmailInput] = useState(false);

  const isVerifyingCode = step === "verifying_email_code";

  // Surface SDK-level errors (e.g. expired session) as inline messages.
  useEffect(() => {
    if (error) {
      setInlineError(error.message ?? "Something went wrong. Please try again.");
    }
  }, [error]);

  useEffect(() => {
    if (isAuthenticated && wallet?.address) {
      onWalletReady?.(wallet.address);
    }
  }, [isAuthenticated, wallet?.address, onWalletReady]);

  if (isAuthenticated && wallet?.address) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-300/80 bg-emerald-50/70 p-3 text-xs font-medium text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100 font-bold">
          âœ“
        </span>
        <span className="truncate">
          Pollar connected â€” {wallet.address.slice(0, 6)}â€¦{wallet.address.slice(-4)}
        </span>
      </div>
    );
  }

  const handleSendCode = async () => {
    setIsBusy(true);
    setInlineError(null);
    try {
      await login({ provider: "email", email });
    } catch (err) {
      setInlineError(
        err instanceof Error ? err.message : "Failed to send code. Please try again.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsBusy(true);
    setInlineError(null);
    try {
      await verifyEmailCode(code);
    } catch (err) {
      setInlineError(
        err instanceof Error
          ? err.message
          : "Invalid or expired code. Please try again.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleResend = async () => {
    setCode("");
    setInlineError(null);
    setIsBusy(true);
    try {
      await login({ provider: "email", email });
    } catch (err) {
      setInlineError(
        err instanceof Error ? err.message : "Failed to resend code. Please try again.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  const runGoogleLogin = async () => {
    setIsBusy(true);
    setInlineError(null);
    try {
      await login({ provider: "google" });
    } catch (err) {
      setInlineError(
        err instanceof Error ? err.message : "Google sign-in failed. Please try again.",
      );
    } finally {
      setIsBusy(false);
    }
  };

  // â”€â”€ Step 2: OTP code input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isVerifyingCode) {
    return (
      <div className="flex w-full flex-col gap-2.5">
        <p className="text-xs text-muted-foreground">
          A 6-digit code was sent to <strong>{email}</strong>. Enter it below.
        </p>

        <div className="flex gap-2">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            disabled={isBusy}
            className="h-10 rounded-xl bg-muted/50 tracking-widest dark:bg-zinc-800/80"
            aria-label="One-time code"
            data-testid="otp-code-input"
          />
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-xl px-4 font-medium"
            disabled={isBusy || code.length < 6}
            onClick={handleVerifyCode}
            data-testid="otp-verify-button"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
          </Button>
        </div>

        {inlineError && (
          <p
            className="text-xs text-destructive"
            role="alert"
            data-testid="otp-error"
          >
            {inlineError}
          </p>
        )}

        <button
          type="button"
          onClick={handleResend}
          disabled={isBusy}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          data-testid="otp-resend-button"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Resend code</span>
        </button>
      </div>
    );
  }

  // â”€â”€ Step 1: provider selection / email input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="flex w-full flex-col gap-2.5">
      <Button
        type="button"
        variant="outline"
        className="h-10 w-full rounded-xl border-zinc-200 bg-white font-medium text-zinc-800 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        disabled={isBusy}
        onClick={runGoogleLogin}
      >
        {isBusy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon className="mr-2 h-4 w-4" />
        )}
        <span>Continue with Google</span>
      </Button>

      {showEmailInput ? (
        <>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isBusy}
              className="h-10 rounded-xl bg-muted/50 dark:bg-zinc-800/80"
              data-testid="email-input"
            />
            <Button
              type="button"
              variant="secondary"
              className="h-10 rounded-xl px-4 font-medium"
              disabled={isBusy || !email}
              onClick={handleSendCode}
              data-testid="send-code-button"
            >
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
            </Button>
          </div>

          {inlineError && (
            <p
              className="text-xs text-destructive"
              role="alert"
              data-testid="email-error"
            >
              {inlineError}
            </p>
          )}
        </>
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
