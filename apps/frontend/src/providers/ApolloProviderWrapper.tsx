"use client";

import { ApolloProvider } from "@apollo/client/react";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const client = new ApolloClient({
  link: new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "/graphql",
  }),
  cache: new InMemoryCache(),
});

interface ApolloProviderWrapperProps {
  children: React.ReactNode;
}

export function ApolloProviderWrapper({ children }: ApolloProviderWrapperProps) {
  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
}
