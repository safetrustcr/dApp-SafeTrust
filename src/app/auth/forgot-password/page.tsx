"use client";

import { ForgotPassword } from "@/components/auth/forgot-password";
import { DashboardFooter } from "@/layouts/Footer";
import { DashboardHeader } from "@/layouts/Header";

export default function ForgotPasswordPage() {
  const handleBackToLogin = () => {
    console.log("Returning to login");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader />
      <main className="flex-1 p-8 pt-6 space-y-4 flex items-center justify-center">
        <ForgotPassword onBackToLogin={handleBackToLogin} />
      </main>
      <DashboardFooter />
    </div>
  );
}
