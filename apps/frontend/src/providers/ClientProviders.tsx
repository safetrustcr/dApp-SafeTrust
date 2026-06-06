"use client";

import { ApolloProviderWrapper } from "@/providers/ApolloProviderWrapper";
import { Toaster } from "@/components/ui/sonner";

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ApolloProviderWrapper>
      {children}
      <Toaster />
    </ApolloProviderWrapper>
  );
}

