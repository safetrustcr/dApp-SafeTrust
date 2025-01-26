"use client";

import { AdminSidebar } from "@/layouts/Sidebar";
import { DashboardHeader } from "@/layouts/Header";
import { DashboardFooter } from "@/layouts/Footer";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import Analytics from "@/pages/SystemManagement/Analytics";

export default function AnalyticsPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SidebarProvider>
        <div className="flex min-h-screen flex-col">
          <div className="flex flex-1">
            <AdminSidebar />
            <SidebarInset className="flex flex-col w-full">
              <DashboardHeader />
              <main className="flex-1 p-8 pt-6 space-y-4">
                <Analytics />
              </main>
              <DashboardFooter />
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
