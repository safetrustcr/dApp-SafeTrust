"use client";

import { ApolloProviderWrapper } from "@/providers/ApolloProviderWrapper";

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <ApolloProviderWrapper>
      {children}
    </ApolloProviderWrapper>
  );
}
