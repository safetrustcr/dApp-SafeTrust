"use client";

import { useGlobalAuthenticationStore } from "@/components/auth/store/data";
import { redirect } from "next/navigation";
import React from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardFooter } from "@/layouts/Footer";
import { DashboardHeader } from "@/layouts/Header";
import { AdminSidebar } from "@/layouts/Sidebar";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { address } = useGlobalAuthenticationStore();

  if (address === "") {
    redirect("/");
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SidebarProvider>
        <div className="flex min-h-screen min-w-full flex-col">
          <div className="flex flex-1">
            <AdminSidebar />
            <SidebarInset className="flex flex-col w-full">
              <DashboardHeader />
              <div className="flex-1 space-y-4">{children}</div>
              <DashboardFooter />
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Layout;
