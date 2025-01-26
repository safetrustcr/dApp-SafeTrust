"use client";

import { DashboardHeader } from "@/layouts/Header";
import { DashboardFooter } from "@/layouts/Footer";
import { Register } from "@/components/auth/register";

export default function RegisterPage() {
  const handleSwitchToLogin = () => {
    console.log("Switching to login");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader />
      <main className="flex-1 p-8 pt-6 space-y-4 flex items-center justify-center">
        <Register onSwitchToLogin={handleSwitchToLogin} />
      </main>
      <DashboardFooter />
    </div>
  );
}
