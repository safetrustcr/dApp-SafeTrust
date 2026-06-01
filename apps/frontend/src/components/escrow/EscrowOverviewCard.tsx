import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Calendar, RefreshCw, AlertTriangle, Coins } from "lucide-react";

export function EscrowOverviewCard() {
  const stats = [
    {
      title: "Total Funds Secured",
      value: "$12,500.00 USDC",
      description: "Locked in active escrows",
      icon: <Coins className="h-5 w-5 text-blue-500" />,
      bg: "bg-blue-50/50 dark:bg-blue-950/15 border-blue-100 dark:border-blue-900/30",
    },
    {
      title: "Active Escrows",
      value: "8 Contracts",
      description: "Agreements currently in progress",
      icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
      bg: "bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-100 dark:border-emerald-900/30",
    },
    {
      title: "Pending Signatures",
      value: "3 Agreements",
      description: "Awaiting tenant signature",
      icon: <Calendar className="h-5 w-5 text-amber-500" />,
      bg: "bg-amber-50/50 dark:bg-amber-950/15 border-amber-100 dark:border-amber-900/30",
    },
    {
      title: "Disputes Raised",
      value: "0 Incidents",
      description: "All payments settled cleanly",
      icon: <AlertTriangle className="h-5 w-5 text-slate-500" />,
      bg: "bg-slate-50/50 dark:bg-slate-950/15 border-slate-100 dark:border-slate-800/30",
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Escrow Overview</h3>
        <p className="text-xs text-slate-400">Current status of your smart contract portfolio on the Stellar network</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className={`border ${stat.bg} overflow-hidden shadow-sm`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{stat.title}</span>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-xl font-black text-slate-900 dark:text-white">{stat.value}</div>
              <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
