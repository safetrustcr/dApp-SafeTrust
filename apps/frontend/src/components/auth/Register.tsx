"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
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

const IS_DEV = process.env.NODE_ENV !== "production";

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

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use":  "An account with this email already exists",
  "auth/weak-password":         "Password must be at least 6 characters",
  "auth/invalid-email":         "Invalid email address",
  "auth/operation-not-allowed": "Email/password registration is not enabled",
  "auth/network-request-failed":"Network error — please check your connection",
};

// ── Client-side validation — runs BEFORE any Firebase call ───────────────────
function validateForm(fields: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  location: string;
}): string | null {
  if (!fields.firstName.trim()) return "First name is required";
  if (!fields.lastName.trim())  return "Last name is required";
  if (!fields.email.trim())     return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    return "Please enter a valid email address";
  if (fields.password.length < 6)
    return "Password must be at least 6 characters";
  if (!fields.phone.trim())     return "Phone number is required";
  if (!/^\d{6,15}$/.test(fields.phone.replace(/\s/g, "")))
    return "Please enter a valid phone number (digits only)";
  if (!fields.location)         return "Please select your location";
  return null;
}

export default function RegisterPage() {
  const router = useRouter();

  const [firstName,        setFirstName]       = useState("");
  const [lastName,         setLastName]        = useState("");
  const [email,            setEmail]           = useState("");
  const [password,         setPassword]        = useState("");
  const [phoneCountryCode, setPhoneCountryCode]= useState("+506");
  const [phone,            setPhone]           = useState("");
  const [location,         setLocation]        = useState("");
  const [isLoading,        setIsLoading]       = useState(false);
  const [error,            setError]           = useState("");

  // Dev-only: role selection — never sent in production
  const [devRole, setDevRole] = useState<"guest" | "host">("guest");

  const clearError = () => setError("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // ── Step 1: client-side validation — Firebase never called if this fails ─
    const validationError = validateForm({
      firstName, lastName, email, password, phone, location,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ??
      process.env.NEXT_PUBLIC_API_URL ??
      "http://localhost:3002";

    setIsLoading(true);
    let firebaseUser = null;

    try {
      // ── Step 2: create Firebase account ──────────────────────────────────
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      firebaseUser = credential.user;

      await updateProfile(firebaseUser, {
        displayName: `${firstName.trim()} ${lastName.trim()}`,
      });

      const token = await firebaseUser.getIdToken();

      // ── Step 3: sync to Hasura ────────────────────────────────────────────
      const controller = new AbortController();
      const timeoutId  = setTimeout(() => controller.abort(), 8000);

      const syncRes = await fetch(`${backendUrl}/api/auth/sync-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name:   firstName.trim(),
          last_name:    lastName.trim(),
          phone_number: phone.trim(),
          country_code: phoneCountryCode,
          location,
          // ── Dev-only: pass selected role so the API can assign it ─────────
          // The API ignores this field entirely in production.
          ...(IS_DEV && { dev_role: devRole }),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!syncRes.ok) {
        // Sync failed — delete Firebase account so user can retry cleanly
        await deleteUser(firebaseUser);
        throw new Error("SYNC_FAILED");
      }

      // ── Step 4: success ───────────────────────────────────────────────────
      Cookies.set("firebase-token", token, {
        expires:  7,
        secure:   true,
        sameSite: "strict",
      });

      useGlobalAuthenticationStore.getState().setToken(token);

      toast.success("Account created successfully!", {
        description: IS_DEV
          ? `Registered as ${devRole}. Please sign in.`
          : "Please sign in with your new credentials.",
        duration: 4000,
      });

      router.push("/login");

    } catch (err: unknown) {
      if (err instanceof FirebaseError) {
        const msg = FIREBASE_ERROR_MESSAGES[err.code] ??
          "Registration failed — please try again";
        toast.error(msg, { duration: 4000 });
        setError(msg);
      } else if (err instanceof Error && err.name === "AbortError") {
        toast.error("Registration timed out. Please try again.", { duration: 4000 });
        setError("Registration timed out — please try again");
      } else if (err instanceof Error && err.message === "SYNC_FAILED") {
        toast.error("Registration failed. Please try again.", { duration: 4000 });
        setError("Could not save your account details — please try again");
      } else {
        toast.error("An unexpected error occurred. Please try again.", { duration: 4000 });
        setError("Registration failed — please try again");
      }
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
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); clearError(); }}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  required
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); clearError(); }}
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <Select
                  value={phoneCountryCode}
                  onValueChange={(v) => { setPhoneCountryCode(v); clearError(); }}
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
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); clearError(); }}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select
                value={location}
                onValueChange={(v) => { setLocation(v); clearError(); }}
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
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
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
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
              />
            </div>

            {/* ── Dev-only role selector ────────────────────────────────────────
                Visible only in development. Never shown in production.
                Lets you test guest vs host dashboard flow without needing
                to call promote-to-host after every fresh DB reset.
            ─────────────────────────────────────────────────────────────────── */}
            {IS_DEV && (
              <div className="space-y-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 px-3 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center rounded-md bg-amber-100 dark:bg-amber-900 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                    DEV ONLY
                  </span>
                  <Label htmlFor="devRole" className="text-xs text-amber-700 dark:text-amber-400">
                    Register as
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDevRole("guest")}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      devRole === "guest"
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                    }`}
                  >
                    🏠 Guest
                  </button>
                  <button
                    type="button"
                    onClick={() => setDevRole("host")}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      devRole === "host"
                        ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
                    }`}
                  >
                    🏢 Host
                  </button>
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-1">
                  {devRole === "host"
                    ? "Will redirect to /dashboard/escrow-dashboard after login"
                    : "Will redirect to /dashboard/guest after login"}
                </p>
              </div>
            )}

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