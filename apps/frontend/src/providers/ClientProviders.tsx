"use client";

import { PollarProvider } from "@pollar/react";
import { ApolloProviderWrapper } from "@/providers/ApolloProviderWrapper";
import { Toaster } from "@/components/ui/sonner";

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ApolloProviderWrapper>
      <PollarProvider
        client={{
          apiKey: process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY!,
        }}
      >
        {children}
        <Toaster />
      </PollarProvider>
    </ApolloProviderWrapper>
  );
}

