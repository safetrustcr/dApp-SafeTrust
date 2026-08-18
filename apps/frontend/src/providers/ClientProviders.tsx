"use client";

import { ApolloProviderWrapper } from "@/providers/ApolloProviderWrapper";
import { PollarProvider } from "@/components/auth/pollar/PollarProvider";
import { usePollarWalletSync } from "@/components/auth/pollar/usePollarWalletSync";
import { Toaster } from "@/components/ui/sonner";

function PollarSessionSync({ children }: { children: React.ReactNode }) {
  usePollarWalletSync();
  return <>{children}</>;
}

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ApolloProviderWrapper>
      <PollarProvider>
        <PollarSessionSync>
          {children}
          <Toaster />
        </PollarSessionSync>
      </PollarProvider>
    </ApolloProviderWrapper>
  );
}

