import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Hotel, Search, BookOpen, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function HotelHeader() {
  return (
    <header className="border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 w-full px-4 md:px-8 py-3.5 flex justify-between items-center">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/img/logo.png" alt="SafeTrust Logo" width={28} height={28} />
          <span className="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight">SafeTrust</span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-500">
          <Link href="/dashboard/hotel" className="flex items-center gap-1 hover:text-slate-850 dark:hover:text-white transition-colors">
            <Search className="h-4 w-4" /> Find Hotels
          </Link>
          <Link href="/dashboard/guest" className="flex items-center gap-1 hover:text-slate-850 dark:hover:text-white transition-colors text-blue-600 dark:text-blue-400">
            <BookOpen className="h-4 w-4" /> Guest Portal
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Stellar Escrow Active</span>
        </div>
      </div>
    </header>
  );
}
