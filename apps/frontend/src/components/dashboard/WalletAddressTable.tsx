import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Plus, Link as LinkIcon } from "lucide-react";

interface WalletAddressTableProps {
  wallets: Array<{
    address: string;
    fullAddress: string;
    isPrimary: boolean;
    network: string;
  }>;
}

export function WalletAddressTable({ wallets }: WalletAddressTableProps) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h3 className="font-semibold text-slate-900 dark:text-white">Linked Wallets</h3>
        <Button size="sm" variant="outline" className="h-8 gap-1">
          <Plus className="h-3.5 w-3.5" /> Link Wallet
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Network</TableHead>
            <TableHead>Public Key / Address</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {wallets.map((wallet, i) => (
            <TableRow key={i}>
              <TableCell className="font-semibold text-slate-900 dark:text-white">
                {wallet.network}
              </TableCell>
              <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-450 leading-relaxed" title={wallet.fullAddress}>
                {wallet.fullAddress}
              </TableCell>
              <TableCell>
                {wallet.isPrimary ? (
                  <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-250 font-semibold text-[10px] gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" /> Primary
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="font-semibold text-[10px]">
                    Backup
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="ghost" className="h-8 text-slate-500 hover:text-slate-800">
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
