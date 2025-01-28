"use client";

import { DashboardHeader } from "@/layouts/Header";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen min-w-full flex-col bg-white dark:bg-black">
        <DashboardHeader />
        <main className="flex p-3 md:p-8 items-start mt-28 md:mt-0 md:items-center flex-1 space-y-4">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}