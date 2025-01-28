"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardFooter } from "@/layouts/Footer";
import { DashboardHeader } from "@/layouts/Header";
import { AdminSidebar } from "@/layouts/Sidebar";
import CreateAlert from "@/pages/SecurityManagement/CreateAlert";

export default function CreateAlertPage() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SidebarProvider>
        <div className="flex min-h-screen flex-col">
          <div className="flex flex-1">
            <AdminSidebar />
            <SidebarInset className="flex flex-col w-full">
              <DashboardHeader />
              <main className="flex-1 p-8 pt-6 space-y-4">
                <CreateAlert />
              </main>
              <DashboardFooter />
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
