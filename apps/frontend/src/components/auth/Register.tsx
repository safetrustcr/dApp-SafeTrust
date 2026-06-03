"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
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
import Illustration from "@/components/auth/ui/Illustration";
import Cookies from "js-cookie";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";

const COUNTRY_CODES = [
  { code: "+506", country: "Costa Rica", flag: "🇨🇷" },
  { code: "+1",   country: "United States", flag: "🇺🇸" },
  { code: "+52",  country: "Mexico", flag: "🇲🇽" },
  { code: "+34",  country: "Spain", flag: "🇪🇸" },
  { code: "+44",  country: "United Kingdom", flag: "🇬🇧" },
  { code: "+49",  country: "Germany", flag: "🇩🇪" },
  { code: "+55",  country: "Brazil", flag: "🇧🇷" },
  { code: "+57",  country: "Colombia", flag: "🇨🇴" },
  { code: "+51",  country: "Peru", flag: "🇵🇪" },
  { code: "+54",  country: "Argentina", flag: "🇦🇷" },
];

const ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists",
  "auth/weak-password": "Password must be at least 6 characters",
  "auth/invalid-email": "Invalid email address",
};

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+506");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const clearError = () => setError("");

 const handleRegister = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  setError("");

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    setError("Server configuration error — please contact support");
    setIsLoading(false);
    return;
  }

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    await updateProfile(credential.user, { displayName: fullName });

    const token = await credential.user.getIdToken();

    // Sync user to PostgreSQL via webhook service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const syncRes = await fetch(
      `${backendUrl}/api/auth/sync-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone_number: phone,
          country_code: phoneCountryCode,
          location,
        }),
      },
    );

    Cookies.set("firebase-token", token, {
      expires: 7,
      secure: true,
      sameSite: "strict",
    });

    clearTimeout(timeoutId);

    if (!syncRes.ok) {
      throw new Error("SYNC_USER_FAILED");
    }

    useGlobalAuthenticationStore.getState().setToken(token);
    toast.success("Account created successfully!", {
      description: "Please sign in with your new credentials.",
      duration: 4000,
    });
    router.push("/login");
  } catch (err: unknown) {
    if (err instanceof FirebaseError) {
        console.log("🔴 Firebase error code:", err.code);
        console.log("🔴 Firebase error message:", err.message);
        toast.error(ERROR_MESSAGES[err.code] ?? "An unexpected error occurred. Please try again.", {
          duration: 4000,
        });
        setError(
          ERROR_MESSAGES[err.code] ?? "Registration failed — please try again",
    );
    } else if (err instanceof Error && err.name === "AbortError") {
      toast.error("Registration timed out. Please try again.", {
        duration: 4000,
      });
      setError("Registration timed out — please try again");
    } else {
      toast.error("An unexpected error occurred. Please try again.", {
        duration: 4000,
      });
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
          <div className="flex items-center justify-between w-full mb-2">
            <div className="flex items-center space-x-2">
              <Image src="/img/logo.png" alt="SafeTrust" width={32} height={32} />
              <h1 className="text-2xl font-bold">SafeTrust</h1>
            </div>
            <ThemeToggle />
          </div>

          <form className="space-y-5 overflow-visible" onSubmit={handleRegister}>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                required
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); clearError(); }}
              />
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                required
                minLength={6}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-[#2857B8] hover:bg-[#2857B8]/90"
              disabled={isLoading}
            >
              Sign Up
            </Button>

            {error ? (
              <p className="text-center text-sm text-red-600">
                {error}
              </p>
            ) : null}
          </form>

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