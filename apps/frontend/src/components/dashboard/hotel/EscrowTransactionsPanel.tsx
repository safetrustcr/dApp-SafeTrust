"use client";

import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HotelEscrowTransaction } from "@/lib/mockData/hotel-dashboard";

type EscrowTransactionsPanelProps = {
  escrows: HotelEscrowTransaction[];
  isLoading?: boolean;
};

function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function EscrowStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        normalized === "FUNDED"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
          : normalized === "PENDING"
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
            : normalized === "RELEASED" || normalized === "COMPLETED"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
      )}
    >
      {normalized}
    </span>
  );
}

function EscrowsSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse rounded-md border border-border/60 p-3"
        >
          <div className="mb-2 h-4 w-2/3 rounded bg-muted" />
          <div className="h-3 w-1/3 rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}

export function EscrowTransactionsPanel({
  escrows,
  isLoading,
}: EscrowTransactionsPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5 text-muted-foreground" />
          Escrow Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <EscrowsSkeleton />
        ) : escrows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <Lock className="h-8 w-8 opacity-50" />
            <p className="text-sm">No escrow transactions</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {escrows.map((escrow) => {
              const amount = escrow.reservation?.total_amount;
              return (
                <li
                  key={escrow.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-3 dark:border-border"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {escrow.contract_id ?? escrow.id.slice(0, 8)}
                    </p>
                    {amount != null ? (
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(Number(amount))}
                      </p>
                    ) : null}
                  </div>
                  <EscrowStatusBadge status={escrow.escrow_status} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
