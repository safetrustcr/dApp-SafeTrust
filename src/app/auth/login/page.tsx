"use client";

import { Login } from "@/components/auth/login";
import { DashboardFooter } from "@/layouts/Footer";
import { DashboardHeader } from "@/layouts/Header";

interface LoginCredentials {
  email: string;
  password: string;
}

export default function Dashboard() {
  const handleSwitchToRegister = () => {
    console.log("Switching to register");
  };

  const handleForgotPassword = () => {
    console.log("Forgot password clicked");
  };

  const handleLogin = (credentials: LoginCredentials) => {
    console.log("Logging in with credentials:", credentials);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader />
      <main className="flex-1 flex items-center justify-center p-8 pt-6">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 shadow-md rounded-lg p-6">
          <Login
            onSwitchToRegister={handleSwitchToRegister}
            onForgotPassword={handleForgotPassword}
            onLogin={handleLogin}
          />
        </div>
      </main>
      <DashboardFooter />
    </div>
  );
}
