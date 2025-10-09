"use client";

import React from "react";
import { ApolloClientProvider } from "./ApolloProvider";

export const ClientProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <ApolloClientProvider>{children}</ApolloClientProvider>;
};
