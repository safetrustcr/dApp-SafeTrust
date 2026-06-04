"use client";

import { useState } from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApartmentStatusBadge } from "@/components/apartments/ApartmentStatusBadge";
import { ApartmentActionsMenu } from "@/components/apartments/ApartmentActionsMenu";

type ApartmentStatus = "inhabited" | "not_inhabited";

interface Apartment {
  id: string;
  name: string;
  location: string;
  offers: number;
  status: ApartmentStatus;
  promoted: boolean;
  price: number;
}

const STUB_APARTMENTS: Apartment[] = [
  { id: "1", name: "La sabana house", location: "San José", offers: 2, status: "inhabited", promoted: true, price: 4000 },
  { id: "2", name: "La sabana house", location: "San José", offers: 5, status: "not_inhabited", promoted: false, price: 4000 },
  { id: "3", name: "La sabana house", location: "San José", offers: 7, status: "not_inhabited", promoted: false, price: 4000 },
  { id: "4", name: "La sabana house", location: "San José", offers: 1, status: "inhabited", promoted: false, price: 4000 },
  { id: "5", name: "La sabana house", location: "San José", offers: 2, status: "inhabited", promoted: true, price: 4000 },
];

const ITEMS_PER_PAGE = 5;

export function MyApartmentsTable() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = search
    ? STUB_APARTMENTS.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.location.toLowerCase().includes(search.toLowerCase())
      )
    : STUB_APARTMENTS;

  const total = filtered.length;
  const paged = filtered.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My apartments</h1>
        <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white">
          <Link href="/dashboard/apartments/new">
            <Home className="h-4 w-4 mr-2" />
            New apartment
          </Link>
        </Button>
      </div>

      <Input
        placeholder="Search anything..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        className="max-w-xs"
      />

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Showing {paged.length} of {total}</span>
        <span>Items per page: {ITEMS_PER_PAGE}</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">ID No.</TableHead>
            <TableHead>Apartment name</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Offers</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Promoted</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.map((apt, index) => (
            <TableRow key={apt.id}>
              <TableCell className="text-gray-400">
                {page * ITEMS_PER_PAGE + index + 1}
              </TableCell>
              <TableCell className="font-semibold text-gray-900">{apt.name}</TableCell>
              <TableCell className="text-gray-500">{apt.location}</TableCell>
              <TableCell className="text-gray-500">{apt.offers}</TableCell>
              <TableCell>
                <ApartmentStatusBadge status={apt.status} />
              </TableCell>
              <TableCell>
                {apt.promoted && <span className="text-orange-500 text-lg">🔥</span>}
              </TableCell>
              <TableCell className="font-medium text-gray-900">
                ${apt.price.toLocaleString()}
              </TableCell>
              <TableCell>
                <ApartmentActionsMenu apartmentId={apt.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-gray-500">
          Showing {paged.length} of {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="text-sm px-2 disabled:opacity-40"
          >
            ←
          </button>
          <span className="text-sm text-gray-500">Page {page + 1}</span>
          <button
            disabled={(page + 1) * ITEMS_PER_PAGE >= total}
            onClick={() => setPage((p) => p + 1)}
            className="text-sm px-2 disabled:opacity-40"
          >
            →
          </button>
        </div>
        <span className="text-sm text-gray-500">Items per page: {ITEMS_PER_PAGE}</span>
      </div>
    </div>
  );
}
