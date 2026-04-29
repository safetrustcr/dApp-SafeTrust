"use client";

import type { ReactNode } from "react";
import {
  development,
  mainNet,
  TrustlessWorkConfig,
} from "@trustless-work/escrow";

const baseURL =
  process.env.NEXT_PUBLIC_TRUSTLESS_WORK_ENV === "mainnet"
    ? mainNet
    : development;

if (!process.env.NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY) {
  console.warn(
    "[TrustlessWorkProvider] NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY is not set. " +
      "All TrustlessWork requests will fail with 401."
  );
}

export function TrustlessWorkProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <TrustlessWorkConfig
      baseURL={baseURL}
      apiKey={process.env.NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY ?? ""}
    >
      {children}
    </TrustlessWorkConfig>
  );
}