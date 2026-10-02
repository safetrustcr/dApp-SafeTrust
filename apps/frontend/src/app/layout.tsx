import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner"
import { HasuraDownBanner } from "@/components/ui/HasuraDownBanner";

// @ts-ignore: allow side-effect import of global css
import "./globals.css";

import { ClientProviders } from "@/providers/ClientProviders";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SafeTrust",
  description: "Decentralized P2P Escrow on Stellar Blockchain",
  icons: {
    icon: "/img/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ClientProviders>
            {children}
            <Toaster richColors position="top-right" />
            {process.env.NODE_ENV !== "production" && <HasuraDownBanner />}
          </ClientProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
