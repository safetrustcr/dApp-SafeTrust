"use client";

import { UserProfileCard } from "./UserProfileCard";
import { WalletAddressTable } from "./WalletAddressTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface User {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  country_code?: string | null;
  location?: string | null;
  last_seen?: string | null;
  user_wallets?: Array<{
    wallet_address: string;
    chain_type: string;
    is_primary: boolean;
  }> | null;
}

interface UsersMonitorTableProps {
  users: User[];
  offset: number;
}

export function UsersMonitorTable({ users, offset }: UsersMonitorTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">ID No.</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Wallet</TableHead>
          <TableHead>Last Seen</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user, index) => (
          <TableRow key={user.id}>
            <TableCell className="text-muted-foreground">
              {offset + index + 1}
            </TableCell>
            <TableCell>
              <UserProfileCard
                firstName={user.first_name}
                lastName={user.last_name}
                email={user.email}
              />
            </TableCell>
            <TableCell className="text-sm">
              {user.country_code && user.phone_number
                ? `${user.country_code} ${user.phone_number}`
                : "—"}
            </TableCell>
            <TableCell>
              <WalletAddressTable
                address={user.user_wallets?.[0]?.wallet_address ?? null}
              />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {user.last_seen
                ? new Date(user.last_seen).toLocaleDateString()
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}