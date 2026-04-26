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