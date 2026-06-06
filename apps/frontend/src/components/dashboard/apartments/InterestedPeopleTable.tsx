import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface RentalOffer {
  id: string | number;
  tenant_name: string;
  tenant_phone: string;
  tenant_wallet_address: string;
  offer_date: string;
  bid_status: "pending" | "accepted" | "rejected";
}

interface InterestedPeopleTableProps {
  offers: RentalOffer[];
  totalCount: number;
  isLoading?: boolean;
}

export function InterestedPeopleTable({
  offers,
  totalCount,
  isLoading,
}: InterestedPeopleTableProps) {
  if (isLoading) {
    return <div className="p-6 text-center text-slate-500">Loading offers...</div>;
  }

  if (offers.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 border border-dashed rounded-lg">
        No interest registered yet for this property.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h3 className="font-semibold text-slate-900 dark:text-white">Rental Offers</h3>
        <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {totalCount} Total
        </Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tenant</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Wallet Address</TableHead>
            <TableHead>Offer Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => (
            <TableRow key={offer.id}>
              <TableCell className="font-semibold text-slate-900 dark:text-white">
                {offer.tenant_name}
              </TableCell>
              <TableCell className="text-slate-600 dark:text-slate-400">
                {offer.tenant_phone}
              </TableCell>
              <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-500">
                {offer.tenant_wallet_address}
              </TableCell>
              <TableCell className="text-slate-600 dark:text-slate-400">
                {new Date(offer.offer_date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    offer.bid_status === "accepted"
                      ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-200"
                      : offer.bid_status === "rejected"
                      ? "bg-rose-50 dark:bg-rose-950/20 text-rose-700 border-rose-200"
                      : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 border-amber-200"
                  }
                >
                  {offer.bid_status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" className="h-8">
                  View Detail
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
