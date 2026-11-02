"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, KeyRound, ArrowLeft } from "lucide-react";
import Buildings from "@/components/auth/ui/Buildings";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { sendPasswordResetEmail } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const ERROR_MESSAGES: Record<string, string> = {
    "auth/user-not-found": "No account found with this email",
    "auth/invalid-email": "Invalid email address",
    "auth/too-many-requests": "Too many requests. Please try again later",
    "auth/internal-error": "Authentication server error",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!auth) {
      setStatus("error");
      setMessage("Configuration error: Authentication service not found.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setStatus("success");
      setMessage("Check your email for password reset instructions.");
      setEmail("");
    } catch (error: unknown) {
      const errCode = error instanceof FirebaseError ? error.code : "unknown";
      setStatus("error");
      setMessage(
        ERROR_MESSAGES[errCode] ?? "Something went wrong — please try again",
      );
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white px-4 transition-colors duration-300 dark:bg-gray-950">
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <Buildings />

      <div className="relative z-10 w-full max-w-sm space-y-6 rounded-2xl border border-gray-200 bg-white/95 p-6 text-center shadow-xl transition-colors duration-300 dark:border-gray-800 dark:bg-gray-900/90">
        <div className="flex justify-center">
          <div className="rounded-full bg-orange-600 p-3 transition-colors duration-300">
            <KeyRound className="h-8 w-8 text-white transition-colors duration-300" />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold transition-colors duration-300 text-zinc-900 dark:text-gray-100">
            Forgot password?
          </h1>
          <p className="text-xs text-muted-foreground transition-colors duration-300">
            No worries, we&apos;ll send you password reset instructions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <Label
              htmlFor="email"
              className="transition-colors duration-300 dark:text-gray-200 text-xs"
            >
              Email address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 rounded-xl transition-colors duration-300 dark:border-gray-700 dark:bg-gray-800/80 dark:text-white dark:placeholder-gray-400 text-sm"
            />
          </div>

          {message && (
            <Alert
              variant={status === "error" ? "destructive" : "default"}
              className={`text-xs transition-colors duration-300 ${
                status === "error"
                  ? "dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 text-left"
                  : "dark:border-green-800 dark:bg-green-900/30 dark:text-green-300 text-left"
              }`}
            >
              <AlertDescription className="transition-colors duration-300">
                {message}
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full h-10 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors duration-300"
            disabled={status === "loading"}
          >
            {status === "loading" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </span>
            ) : (
              "Send instructions"
            )}
          </Button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="flex w-full items-center justify-center text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 transition-colors duration-300"
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to sign in
          </button>
        </form>
      </div>
    </div>
  );
}
