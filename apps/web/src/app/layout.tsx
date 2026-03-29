import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'SafeTrust',
  description: 'Decentralized P2P escrow on Stellar',
};

function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
