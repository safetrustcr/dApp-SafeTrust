"use client";

import { HeroSection } from "@/components/home/HeroSection";
import { CTASection } from "@/components/home/CTASection";
import { DashboardFooter } from "@/layouts/Footer";
import ThemeToggle from "@/layouts/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {/* Logo o nombre de la app puede ir aquí */}
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <Button
                onClick={() => router.push("/auth/login")}
                variant="default"
                size="sm"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Añadir padding-top para compensar el header fijo */}
      <main className="flex-1 pt-16">
        <HeroSection />
        <CTASection />
      </main>

      <DashboardFooter />
    </div>
  );
}
