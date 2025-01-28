"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    console.log("Login attempt with:", { email, password });
    router.push("/dashboard");
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-white dark:bg-background overflow-hidden">
      <CardHeader>
        <CardTitle className="text-black dark:text-gray-100">Log In</CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400">
          Access your employee account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white dark:bg-background text-black dark:text-gray-100 border border-gray-300 dark:border-gray-700"
            />
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="password"
              className="text-gray-700 dark:text-gray-300"
            >
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white dark:bg-background text-black dark:text-gray-100 border border-gray-300 dark:border-gray-700"
            />
          </div>
          {error && (
            <Alert
              variant="destructive"
              className="bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-200 border dark:border-red-700"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            type="submit"
            className="w-full text-white bg-gradient-to-br from-blue-600 to-blue-800 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-200 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center"
          >
            Log In
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <Link
          href="/auth/register"
          className="text-gray-700 dark:text-gray-400"
        >
          Don’t have an account? Register here
        </Link>
        <Link
          href="/auth/forgot-password"
          className="text-gray-700 dark:text-gray-400"
        >
          Forgot your password?
        </Link>
      </CardFooter>
    </Card>
  );
}
