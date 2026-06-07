"use client";

import { ApolloProvider } from "@apollo/client/react";
import { apolloClient } from "@/config/apollo";

interface ApolloProviderWrapperProps {
  children: React.ReactNode;
}

export function ApolloProviderWrapper({ children }: ApolloProviderWrapperProps) {
  return (
    <ApolloProvider client={apolloClient}>
      {children}
    </ApolloProvider>
  );
}