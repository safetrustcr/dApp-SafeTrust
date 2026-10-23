"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useGlobalAuthenticationStore } from "@/core/store/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import Illustration from "@/components/auth/ui/Illustration";
import {
  AuthMotion,
  AuthMotionPanel,
  AuthMotionItem,
  AuthMotionButton,
  AuthMotionError,
} from "@/components/auth/ui/AuthMotion";
import Cookies from "js-cookie";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";
import { PollarLoginButton } from "@/components/auth/pollar/PollarLoginButton";
import { useRegisterForm } from "@/hooks/use-register-form";
import { validateRegisterForm } from "@/lib/auth/register-validation";
import { registerUser } from "@/lib/auth/register-user";
import { getRegisterErrorMessage } from "@/lib/auth/register-errors";
import { getBackendUrl } from "@/lib/config";
import { Loader2 } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+506", country: "Costa Rica", flag: "🇨🇷" },
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+51", country: "Peru", flag: "🇵🇪" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
];

export default function Register() {
  const router = useRouter();

  const {
    fields,
    handleChange,
    isLoading,
    setIsLoading,
    error,
    setError,
  } = useRegisterForm();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validateRegisterForm(fields);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const { token } = await registerUser(auth, fields, getBackendUrl());

      Cookies.set("firebase-token", token, {
        expires: 7,
        secure: true,
        sameSite: "strict",
      });

      useGlobalAuthenticationStore.getState().setToken(token);

      toast.success("Account created successfully!", {
        description: "Taking you to your SafeTrust guest dashboard.",
        duration: 4000,
      });

      router.push("/dashboard");
    } catch (err: unknown) {
      const message = getRegisterErrorMessage(err);
      toast.error(message, { duration: 4000 });
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthMotion>
      <div className="flex min-h-screen">
        <div className="flex w-full flex-col items-center justify-center px-4 sm:px-6 md:w-1/2 py-8">
          <AuthMotionPanel className="w-full max-w-sm space-y-6">
            {/* Header */}
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
                Create an account
              </h2>
              <p className="text-xs text-muted-foreground">
                Join SafeTrust to secure deposits with blockchain escrow
              </p>
            </AuthMotionItem>

            <form className="space-y-4" onSubmit={handleRegister}>
              {/* First Name + Last Name */}
              <AuthMotionItem className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    required
                    value={fields.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    disabled={isLoading}
                    className="h-10 rounded-xl bg-muted/40 dark:bg-zinc-800/60 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    required
                    value={fields.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    disabled={isLoading}
                    className="h-10 rounded-xl bg-muted/40 dark:bg-zinc-800/60 text-sm"
                  />
                </div>
              </AuthMotionItem>

              {/* Email */}
              <AuthMotionItem className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="john@example.com"
                  required
                  value={fields.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={isLoading}
                  className="h-10 rounded-xl bg-muted/40 dark:bg-zinc-800/60 text-sm"
                />
              </AuthMotionItem>

              {/* Password */}
              <AuthMotionItem className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  required
                  value={fields.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  disabled={isLoading}
                  className="h-10 rounded-xl bg-muted/40 dark:bg-zinc-800/60 text-sm"
                />
              </AuthMotionItem>

              {/* Phone */}
              <AuthMotionItem className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <div className="flex gap-2">
                  <Select
                    value={fields.phoneCountryCode}
                    onValueChange={(val) => handleChange("phoneCountryCode", val)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-[110px] shrink-0 h-10 rounded-xl bg-muted/40 dark:bg-zinc-800/60 text-xs">
                      <SelectValue placeholder="Code" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRY_CODES.map(({ code, country, flag }) => (
                        <SelectItem key={code} value={code} className="text-xs">
                          {flag} {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="8888 8888"
                    required
                    value={fields.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    disabled={isLoading}
                    className="h-10 flex-1 rounded-xl bg-muted/40 dark:bg-zinc-800/60 text-sm"
                  />
                </div>
              </AuthMotionItem>

              {/* Location */}
              <AuthMotionItem className="space-y-1.5">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, Country"
                  required
                  value={fields.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  disabled={isLoading}
                  className="h-10 rounded-xl bg-muted/40 dark:bg-zinc-800/60 text-sm"
                />
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
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
                    </span>
                  ) : (
                    "Create account"
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

            <AuthMotionItem>
              <PollarLoginButton onWalletReady={() => router.push("/dashboard")} />
            </AuthMotionItem>

            <AuthMotionItem className="text-center text-xs text-muted-foreground pt-1">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 underline underline-offset-4"
              >
                Sign in
              </Link>
            </AuthMotionItem>
          </AuthMotionPanel>
        </div>

        <AuthMotionPanel className="hidden md:flex md:w-1/2 bg-zinc-50 dark:bg-zinc-900/40 items-center justify-center p-8 border-l border-zinc-200/60 dark:border-zinc-800/60">
          <AuthMotionItem className="w-full max-w-md">
            <Illustration className="w-full h-auto" />
          </AuthMotionItem>
        </AuthMotionPanel>
      </div>
    </AuthMotion>
  );
}
