"use client";

import { ApolloProviderWrapper } from "@/providers/ApolloProviderWrapper";
import { PollarProvider } from "@/components/auth/pollar/PollarProvider";
import { Toaster } from "@/components/ui/sonner";

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ApolloProviderWrapper>
      <PollarProvider>
        {children}
        <Toaster />
      </PollarProvider>
    </ApolloProviderWrapper>
  );
}

