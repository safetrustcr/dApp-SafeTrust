import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database } from "lucide-react";

export function CacheStatus() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
    }, 1000);
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 gap-1.5 py-1 px-2.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Database className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-xs font-semibold">Cache Synchronized</span>
      </Badge>
      <button
        onClick={handleSync}
        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 transition-all text-slate-500 hover:text-slate-700"
        title="Sync cache with Hasura GraphQL"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-blue-500" : ""}`} />
      </button>
    </div>
  );
}
