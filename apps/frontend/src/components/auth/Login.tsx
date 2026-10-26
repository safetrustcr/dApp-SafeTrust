"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";
import { useGlobalAuthenticationStore } from "@/core/store/data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Illustration from "@/components/auth/ui/Illustration";
import {
  AuthMotion,
  AuthMotionPanel,
  AuthMotionItem,
  AuthMotionButton,
  AuthMotionError,
} from "@/components/auth/ui/AuthMotion";
import { PollarLoginButton } from "@/components/auth/pollar/PollarLoginButton";
import { MainWalletSelectionModal } from "./wallet/components/MainWalletSelectionModal";
import { Wallet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Invalid email or password",
  "auth/user-not-found": "No account found with this email",
  "auth/wrong-password": "Invalid email or password",
  "auth/too-many-requests": "Too many attempts — please try again later",
  "auth/invalid-email": "Invalid email address",
};

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useGlobalAuthenticationStore((state) => state.token);
  const setToken = useGlobalAuthenticationStore((state) => state.setToken);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const redirectPath = searchParams?.get("redirect") || "/dashboard";

  useEffect(() => {
    if (token) {
      router.push(redirectPath);
    }
  }, [token, router, redirectPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const idToken = await credential.user.getIdToken();

      // Store in Zustand and document cookies
      setToken(idToken);
      if (remember) {
        Cookies.set("firebase-token", idToken, { expires: 7, secure: true, sameSite: "strict" });
      } else {
        Cookies.set("firebase-token", idToken, { secure: true, sameSite: "strict" });
      }

      toast.success("Welcome back!", {
        description: "Redirecting to your dashboard...",
      });
      router.push(redirectPath);
    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        const msg = ERROR_MESSAGES[err.code] ?? "Login failed — please check your credentials";
        setError(msg);
        toast.error(msg);
      } else {
        setError("An unexpected error occurred. Please try again.");
        toast.error("Login failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthMotion>
      <div className="flex min-h-screen">
        <div className="flex w-full flex-col items-center justify-center px-4 sm:px-6 md:w-1/2 py-8">
          <AuthMotionPanel className="w-full max-w-sm space-y-6">
            <AuthMotionItem className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-2.5">
                <Image
                  src="/img/logo.png"
                  alt="SafeTrust"
                  width={36}
                  height={36}
                  className="h-9 w-9 object-contain"
                />
                <span className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  SafeTrust
                </span>
              </div>
              <ThemeToggle />
            </AuthMotionItem>

            <AuthMotionItem className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Sign in to your account
              </h2>
              <p className="text-xs text-muted-foreground">
                Enter your credentials or connect via Web3 wallet
              </p>
            </AuthMotionItem>

            <form className="space-y-4" onSubmit={handleLogin}>
              <AuthMotionItem className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  required
                  disabled={isLoading}
                  className="h-10 rounded-xl bg-muted/40 dark:bg-zinc-800/60"
                />
              </AuthMotionItem>

              <AuthMotionItem className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-orange-600 hover:text-orange-700 dark:text-orange-400 font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  required
                  disabled={isLoading}
                  className="h-10 rounded-xl bg-muted/40 dark:bg-zinc-800/60"
                />
              </AuthMotionItem>

              <AuthMotionItem className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  name="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  disabled={isLoading}
                />
                <Label
                  htmlFor="remember"
                  className="font-normal text-xs cursor-pointer text-zinc-600 dark:text-zinc-400"
                >
                  Keep me signed in on this device
                </Label>
              </AuthMotionItem>

              <Button
                asChild
                type="submit"
                className="w-full h-10 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-sm transition-all"
                disabled={isLoading}
              >
                <AuthMotionButton disabled={isLoading}>
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                    </span>
                  ) : (
                    "Sign in"
                  )}
                </AuthMotionButton>
              </Button>

              {error && <AuthMotionError>{error}</AuthMotionError>}
            </form>

            <AuthMotionItem className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground font-medium">
                  or continue with
                </span>
              </div>
            </AuthMotionItem>

            <AuthMotionItem className="space-y-2.5">
              {/* Pollar Web3 Login */}
              <PollarLoginButton onWalletReady={() => router.push(redirectPath)} />

              {/* Stellar Wallet Connect */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 font-medium text-xs flex items-center justify-center gap-2"
                onClick={() => setIsWalletModalOpen(true)}
              >
                <Wallet className="h-4 w-4 text-orange-600" />
                <span>Connect Stellar Wallet</span>
              </Button>
            </AuthMotionItem>

            <AuthMotionItem className="text-center text-xs text-muted-foreground pt-2">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 underline underline-offset-4"
              >
                Register here
              </Link>
            </AuthMotionItem>
          </AuthMotionPanel>
        </div>

        <AuthMotionPanel className="hidden md:flex md:w-1/2 bg-zinc-50 dark:bg-zinc-900/40 items-center justify-center p-8 border-l border-zinc-200/60 dark:border-zinc-800/60">
          <AuthMotionItem className="w-full max-w-md">
            <Illustration className="w-full h-auto" />
          </AuthMotionItem>
        </AuthMotionPanel>

        <MainWalletSelectionModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
        />
      </div>
    </AuthMotion>
  );
}