"use client";

import { useEffect, type ReactNode } from "react";

import { Header } from "@/components/layouts/Header";

export default function EscrowDetailLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const classNameSnapshot = html.className;
    html.classList.remove("dark");
    html.classList.add("light");
    return () => {
      const stillOnForcedLight =
        html.classList.contains("light") && !html.classList.contains("dark");
      if (stillOnForcedLight) {
        html.className = classNameSnapshot;
      }
    };
  }, []);

  return (
    <>
      <Header />
      {children}
    </>
  );
}
