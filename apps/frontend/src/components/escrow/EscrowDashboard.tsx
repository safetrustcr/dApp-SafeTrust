import React from "react";
import { EscrowOverviewCard } from "./EscrowOverviewCard";
import EscrowPage from "@/app/dashboard/escrow/page";

export function EscrowDashboard() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Escrow Control Panel</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Decentralised smart contract control center powered by Trustless Work API.
        </p>
      </div>

      {/* Stats cards overview */}
      <EscrowOverviewCard />

      {/* Main List Table */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-6">
        <EscrowPage />
      </div>
    </div>
  );
}
