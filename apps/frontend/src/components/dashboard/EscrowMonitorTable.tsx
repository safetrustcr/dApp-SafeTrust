"use client";

import { EscrowStatusBadge } from "./EscrowStatusBadge";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Escrow {
  id: string;
  engagement_id: string;
  status: string;
  amount: number;
  created_at: string;
  tenant_id: string;
}

export function EscrowMonitorTable({
  escrows,
  offset,
}: {
  escrows: Escrow[];
  offset: number;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID No.</TableHead>
          <TableHead>Engagement ID</TableHead>
          <TableHead>Wallet</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {escrows.map((escrow, index) => (
          <TableRow key={escrow.id}>
            <TableCell>{offset + index + 1}</TableCell>
            <TableCell className="font-mono text-xs">
              {escrow.engagement_id}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {escrow.tenant_id.slice(0, 6)}...
              {escrow.tenant_id.slice(-4)}
            </TableCell>
            <TableCell>
              ${escrow.amount?.toLocaleString() ?? "—"}
            </TableCell>
            <TableCell>
              {new Date(escrow.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell>
              <EscrowStatusBadge status={escrow.status as any} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
