"use client";

import React from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { MapPin, Bed, Bath, Plus } from "lucide-react";

export function MyApartmentsTable() {
  const router = useRouter();

  const apartments = [
    {
      id: 1,
      name: "La sabana house",
      location: "San José",
      address: "329 Calle Santos, Paseo Colón, San José",
      bedrooms: 2,
      bathrooms: 1,
      price: 4058.0,
      status: "not_inhabited",
      offersCount: 10,
    },
    {
      id: 2,
      name: "Downtown Penthouse",
      location: "San José",
      address: "88 Avenida Central, San José",
      bedrooms: 3,
      bathrooms: 2,
      price: 6500.0,
      status: "inhabited",
      offersCount: 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Properties</h1>
          <p className="text-xs text-slate-400">Manage listings and view tenant rental bids.</p>
        </div>
        <Button onClick={() => router.push("/dashboard/apartments/new")} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
          <Plus className="h-4 w-4" /> Add Property
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Specs</TableHead>
              <TableHead>Monthly Rent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apartments.map((apt) => (
              <TableRow key={apt.id}>
                <TableCell className="font-semibold text-slate-900 dark:text-white">
                  {apt.name}
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-450 shrink-0" />
                    <span className="text-xs truncate max-w-[200px]" title={apt.address}>
                      {apt.address}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5 text-slate-400" /> {apt.bedrooms} Bed</span>
                    <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5 text-slate-400" /> {apt.bathrooms} Bath</span>
                  </div>
                </TableCell>
                <TableCell className="font-bold text-slate-900 dark:text-white">
                  ${apt.price.toFixed(2)} USDC
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      apt.status === "inhabited"
                        ? "bg-slate-50 dark:bg-slate-950/20 text-slate-700 border-slate-200"
                        : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-250"
                    }
                  >
                    {apt.status === "inhabited" ? "Leased" : "Available"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/apartments/${apt.id}/offers`)}
                      className="h-8 gap-1.5"
                    >
                      Offers {apt.offersCount > 0 && <Badge className="bg-blue-600 hover:bg-blue-650 h-5 px-1.5 text-[10px] text-white shrink-0">{apt.offersCount}</Badge>}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
