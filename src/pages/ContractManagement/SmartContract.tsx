"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client/react";
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
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Clock, Bell, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { GET_ESCROWS, GET_ESCROW_METRICS } from "@/lib/graphql/queries";
import type {
  GetEscrowsData,
  GetEscrowsVariables,
  GetEscrowMetricsData,
  EscrowFilter,
} from "@/lib/graphql/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusColors: { [key: string]: string } = {
  active:
    "bg-green-100 text-green-800 dark:bg-[rgb(14,40,26)] dark:text-[rgb(57,133,79)]",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-[rgb(36,24,0)] dark:text-[rgb(154,105,34)]",
  disputed:
    "bg-red-100 text-red-800 dark:bg-[rgb(58,38,39)] dark:text-[rgb(207,98,80)]",
  completed:
    "bg-blue-100 text-blue-800 dark:bg-[rgb(14,26,40)] dark:text-[rgb(57,108,133)]",
  cancelled:
    "bg-gray-100 text-gray-800 dark:bg-[rgb(26,26,26)] dark:text-[rgb(133,133,133)]",
};

const PAGE_SIZE = 10;

export default function SmartContract() {
  const [currentPage, setCurrentPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const where: EscrowFilter = {};
  if (statusFilter !== "all") {
    where.status = { _eq: statusFilter };
  }

  const {
    data: escrowsData,
    loading: escrowsLoading,
    error: escrowsError,
    refetch: refetchEscrows,
  } = useQuery<GetEscrowsData, GetEscrowsVariables>(GET_ESCROWS, {
    variables: {
      limit: PAGE_SIZE,
      offset: currentPage * PAGE_SIZE,
      order_by: [{ created_at: "desc" }],
      where,
    },
    fetchPolicy: "cache-and-network",
  });

  // Query metrics
  const {
    data: metricsData,
    loading: metricsLoading,
    error: metricsError,
  } = useQuery<GetEscrowMetricsData>(GET_ESCROW_METRICS, {
    fetchPolicy: "cache-and-network",
  });

  const escrows = escrowsData?.escrows || [];
  const totalCount = escrowsData?.escrows_aggregate?.aggregate?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(0);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const formatAmount = (amount: string, token: string) => {
    const numAmount = Number.parseFloat(amount);
    if (isNaN(numAmount)) return `${amount} ${token}`;
    return `${numAmount.toLocaleString()} ${token}`;
  };

  const formatDate = (timestamp: string) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const metrics = metricsData
    ? [
        {
          title: "Total Value Locked",
          value: `$${Number.parseFloat(
            metricsData.escrows_aggregate.aggregate.sum.amount || "0"
          ).toLocaleString()}`,
          description: `${metricsData.active.aggregate.count} active contracts`,
          icon: <Lock className="w-5 h-5" />,
        },
        {
          title: "Active Contracts",
          value: metricsData.active.aggregate.count.toString(),
          description: `${metricsData.pending.aggregate.count} pending execution`,
          icon: <Clock className="w-5 h-5" />,
        },
        {
          title: "Total Contracts",
          value: metricsData.escrows_aggregate.aggregate.count.toString(),
          description: `${metricsData.escrows_aggregate.aggregate.count} total contracts`,
          icon: <Bell className="w-5 h-5" />,
        },
        {
          title: "Disputes",
          value: metricsData.disputed.aggregate.count.toString(),
          description: `${metricsData.disputed.aggregate.count} need review`,
          icon: <AlertTriangle className="w-5 h-5" />,
        },
      ]
    : [];

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">
            Smart Contract Tracking
          </h2>
          <Button className="rounded-xl bg-muted-900 text-primary hover:bg-muted/100">
            Create Contract <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="flex w-full justify-center">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {metricsLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Card
                  key={index}
                  className="bg-background rounded-lg shadow-lg relative w-64"
                >
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-4 w-40" />
                  </CardContent>
                </Card>
              ))
            ) : metricsError ? (
              <div className="col-span-4 text-center text-destructive">
                Error loading metrics: {metricsError.message}
              </div>
            ) : (
              metrics.map((metric, index) => (
                <Card
                  key={index}
                  className="bg-background rounded-lg shadow-lg relative w-64"
                >
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center text-md font-semibold">
                      {metric.title}
                      <span className="text-gray-400 text-md">
                        {metric.icon}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{metric.value}</p>
                    <p className="text-sm text-gray-400 mt-2">
                      {metric.description}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Escrows Table */}
        <div>
          <div className="p-6 bg-background text-card-foreground shadow-lg rounded-lg border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Recent Contracts</h2>
              <div className="flex items-center gap-4">
                <Select
                  value={statusFilter}
                  onValueChange={handleStatusFilterChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="disputed">Disputed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchEscrows()}
                  disabled={escrowsLoading}
                >
                  Refresh
                </Button>
              </div>
            </div>

            {escrowsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : escrowsError ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Error Loading Contracts</EmptyTitle>
                  <EmptyMedia variant="icon">
                    <AlertTriangle className="w-12 h-12" />
                  </EmptyMedia>
                </EmptyHeader>
                <EmptyDescription>{`Failed to load escrow contracts: ${escrowsError.message}`}</EmptyDescription>
                <EmptyContent>
                  <Button onClick={() => refetchEscrows()} variant="outline">
                    Try Again
                  </Button>
                </EmptyContent>
              </Empty>
            ) : escrows.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No Contracts Found</EmptyTitle>
                </EmptyHeader>
                <EmptyDescription>
                  {statusFilter !== "all"
                    ? `No contracts found with status "${statusFilter}"`
                    : "No escrow contracts have been created yet."}
                </EmptyDescription>
                <EmptyContent>
                  {statusFilter !== "all" ? (
                    <Button
                      onClick={() => setStatusFilter("all")}
                      variant="outline"
                    >
                      Clear Filter
                    </Button>
                  ) : undefined}
                </EmptyContent>
              </Empty>
            ) : (
              <>
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="border-b border-muted">
                      <TableHead className="text-left text-muted-foreground">
                        Contract ID / Address
                      </TableHead>
                      <TableHead className="text-left text-muted-foreground">
                        Tenant
                      </TableHead>
                      <TableHead className="text-left text-muted-foreground">
                        Amount / Token
                      </TableHead>
                      <TableHead className="text-left text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="text-left text-muted-foreground">
                        Created Date
                      </TableHead>
                      <TableHead className="text-left text-muted-foreground">
                        Last Event
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {escrows.map((escrow) => (
                      <TableRow
                        key={escrow.id}
                        className="py-4 border-b border-muted hover:bg-muted/20"
                      >
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="font-mono text-sm">
                              {escrow.id}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatAddress(escrow.address)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{escrow.tenant.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {formatAddress(escrow.tenant.address)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatAmount(escrow.amount, escrow.token)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`rounded-full px-3 py-1 ${
                              statusColors[escrow.status]
                            }`}
                          >
                            {escrow.status.charAt(0).toUpperCase() +
                              escrow.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(escrow.created_at)}</TableCell>
                        <TableCell>{formatDate(escrow.last_event)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {currentPage * PAGE_SIZE + 1} to{" "}
                      {Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} of{" "}
                      {totalCount} contracts
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={currentPage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="text-sm">
                        Page {currentPage + 1} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage >= totalPages - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
