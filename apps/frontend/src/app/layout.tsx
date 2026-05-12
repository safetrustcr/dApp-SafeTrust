import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TrustlessWorkProvider } from "@/providers/TrustlessWorkProvider";
import "./globals.css";
import { ClientProviders } from "@/providers/ClientProviders";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SafeTrust",
  description: "Decentralized P2P Escrow on Stellar Blockchain",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}