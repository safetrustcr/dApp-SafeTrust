"use client";

import React from "react";

import GuestBookingsSummary from "./GuestBookingsSummary";
import { useGlobalAuthenticationStore } from "@/core/store/data";
import { Button } from "@/components/ui/button";
import { Wallet, ShieldCheck } from "lucide-react";
import { useMultiWallet } from "@/components/auth/wallet/hooks/multi-wallet.hook";

export default function GuestDashboard() {
  const { address } = useGlobalAuthenticationStore();
  const { handleConnect } = useMultiWallet();

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Guest Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Book hotels, secure deposits, and manage trustless rental transactions on Stellar.
          </p>
        </div>
      </div>

      {/* Wallet Status box */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row justify-between md:items-center gap-4">
        {address ? (
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Secured Stellar Address</p>
              <p className="text-sm font-mono text-slate-700 dark:text-slate-300 break-all leading-relaxed mt-0.5">
                {address}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">freighter wallet not connected</p>
              <p className="text-xs text-slate-500">Connect a Freighter or Lobstr wallet to authorize and claim secure rental escrows.</p>
            </div>
            <Button onClick={handleConnect} className="bg-blue-600 hover:bg-blue-700 gap-2 shrink-0">
              <Wallet className="h-4 w-4" /> Connect Stellar Wallet
            </Button>
          </div>
        )}
      </div>

      {/* Guest Bookings summary list */}
      <GuestBookingsSummary />
    </div>
  );
}
