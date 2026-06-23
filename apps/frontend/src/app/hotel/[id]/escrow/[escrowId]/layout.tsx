"use client";

import { useEffect, type ReactNode } from "react";

import { Header } from "@/components/layouts/Header";

export default function EscrowDetailLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const hadDark = html.classList.contains("dark");
    html.classList.remove("dark");
    html.classList.add("light");
    return () => {
      html.classList.remove("light");
      if (hadDark) html.classList.add("dark");
    };
  }, []);

  return (
    <>
      <Header />
      {children}
    </>
  );
}
