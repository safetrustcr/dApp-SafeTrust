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
import Cookies from "js-cookie";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";
import { PollarLoginButton } from "@/components/auth/pollar/PollarLoginButton";
import { PollarWalletStatus } from "@/components/auth/pollar/PollarWalletStatus";
import { useRegisterForm } from "@/hooks/use-register-form";
import { validateRegisterForm } from "@/lib/auth/register-validation";
import { registerUser } from "@/lib/auth/register-user";
import { getRegisterErrorMessage } from "@/lib/auth/register-errors";
import { getBackendUrl } from "@/lib/config";

const COUNTRY_CODES = [
  { code: "+506", country: "Costa Rica",     flag: "🇨🇷" },
  { code: "+1",   country: "United States",  flag: "🇺🇸" },
  { code: "+52",  country: "Mexico",         flag: "🇲🇽" },
  { code: "+34",  country: "Spain",          flag: "🇪🇸" },
  { code: "+44",  country: "United Kingdom", flag: "🇬🇧" },
  { code: "+49",  country: "Germany",        flag: "🇩🇪" },
  { code: "+55",  country: "Brazil",         flag: "🇧🇷" },
  { code: "+57",  country: "Colombia",       flag: "🇨🇴" },
  { code: "+51",  country: "Peru",           flag: "🇵🇪" },
  { code: "+54",  country: "Argentina",      flag: "🇦🇷" },
];

export default function RegisterPage() {
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
        expires:  7,
        secure:   true,
        sameSite: "strict",
      });

      useGlobalAuthenticationStore.getState().setToken(token);

      toast.success("Account created successfully!", {
        description: "Taking you to your SafeTrust dashboard.",
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
    <div className="flex min-h-screen">
      <div className="flex w-full flex-col items-center justify-center px-4 md:w-1/2">
        <div className="w-full max-w-sm space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between w-full mb-2">
            <div className="flex items-center space-x-2">
              <Image src="/img/logo.png" alt="SafeTrust" width={32} height={32} />
              <h1 className="text-2xl font-bold">SafeTrust</h1>
            </div>
            <ThemeToggle />
          </div>

          <form className="space-y-5 overflow-visible" onSubmit={handleRegister}>

            {/* First Name + Last Name */}
            <div className="flex gap-2">
              <div className="space-y-2 flex-1">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="First name"
                  required
                  value={fields.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  required
                  value={fields.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <Select
                  value={fields.phoneCountryCode}
                  onValueChange={(v) => handleChange("phoneCountryCode", v)}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Code" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {COUNTRY_CODES.map(({ code, country, flag }) => (
                      <SelectItem key={code} value={code}>
                        {flag} {code} — {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  required
                  value={fields.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select
                value={fields.location}
                onValueChange={(v) => handleChange("location", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your location" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value="cr">Costa Rica</SelectItem>
                  <SelectItem value="us">United States</SelectItem>
                  <SelectItem value="mx">Mexico</SelectItem>
                  <SelectItem value="es">Spain</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                required
                value={fields.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                required
                minLength={6}
                value={fields.password}
                onChange={(e) => handleChange("password", e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#2857B8] hover:bg-[#2857B8]/90"
              disabled={isLoading}
            >
              {isLoading ? "Creating account…" : "Sign Up"}
            </Button>

            {error && (
              <p className="text-center text-sm text-red-600">{error}</p>
            )}
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-[#0a0a0a] px-2 text-muted-foreground dark:text-gray-400">
                or
              </span>
            </div>
          </div>

          <PollarWalletStatus />
          <PollarLoginButton
            onWalletReady={() => router.push("/dashboard/escrow-dashboard")}
          />

          <div className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-[#2857B8] hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <Illustration />
    </div>
  );
}
