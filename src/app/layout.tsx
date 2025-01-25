import type { Metadata } from "next";
import { Inter, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AdminSidebar } from "@/layouts/Sidebar";
import { Header } from "@/layouts/Header";
import { Footer } from "@/layouts/Footer";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SafeTrust",
  description: "Secure Deposits SafeTrust",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SidebarProvider className="block">
            <div className="flex min-h-screen flex-col">
              <div className="flex flex-1">
                <AdminSidebar />
                <SidebarInset className="flex flex-col overflow-hidden">
                  <Header />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </SidebarInset>
              </div>
            </div>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
