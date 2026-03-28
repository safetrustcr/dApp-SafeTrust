import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "SafeTrust | Escrow Creation",
    description: "Secure P2P Escrow on Stellar",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-slate-50/50">{children}</body>
        </html>
    );
}
