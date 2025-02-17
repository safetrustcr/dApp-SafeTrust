"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  AlertTriangle,
  BadgeDollarSign,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

export default function DashboardAnalytics() {
  const recentDeposits = [
    {
      type: "Security Deposit",
      contract: "SC-2023-001",
      status: "completed",
      amount: 5000.0,
      date: "2023-12-20",
    },
    {
      type: "Escrow Payment",
      contract: "SC-2023-002",
      status: "pending",
      amount: 12500.0,
      date: "2023-12-18",
    },
    {
      type: "Performance Bond",
      contract: "SC-2023-003",
      status: "completed",
      amount: 7800.0,
      date: "2023-12-18",
    },
    {
      type: "Security Deposit",
      contract: "SC-2023-004",
      status: "completed",
      amount: 3200.0,
      date: "2023-12-17",
    },
    {
      type: "Escrow Payment",
      contract: "SC-2023-005",
      status: "pending",
      amount: 9400.0,
      date: "2023-12-16",
    },
  ];

  const contractStatus = [
    {
      id: "SC-2023-001",
      type: "Security Deposit Contract",
      status: "Active",
      amount: 5000.0,
    },
    {
      id: "SC-2023-002",
      type: "Escrow Agreement",
      status: "Active",
      amount: 12500.0,
    },
    {
      id: "SC-2023-003",
      type: "Performance Bond",
      status: "Warning",
      amount: 7800.0,
    },
    {
      id: "SC-2023-004",
      type: "Security Deposit Contract",
      status: "Active",
      amount: 3200.0,
    },
  ];

  const ITEMS = recentDeposits.map((item) => ({
    ...item,
    id: uuidv4(),
  }));

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
            <BadgeDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <p className="text-xs text-muted-foreground">+$20.1k from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Contracts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">4 new this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">1 critical case</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Deposits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {ITEMS.map((deposit) => (
              <div
                key={deposit.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-background gap-2 sm:gap-4"
              >
                <div className="w-full sm:w-auto">
                  <p className="font-medium">{deposit.type}</p>
                  <p className="text-sm text-muted-foreground">
                    Contract #{deposit.contract}
                  </p>
                </div>
                <Badge
                  variant={deposit.status === "completed" ? "default" : "secondary"}
                  className={deposit.status === "completed" ? "bg-black text-white" : "bg-gray-200 text-gray-700"}
                >
                  {deposit.status}
                </Badge>
                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <p className="font-medium">${deposit.amount.toLocaleString()}</p>
                  <p className="text-xs">{deposit.date}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Smart Contract Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {contractStatus.map((contract) => (
              <div
                key={contract.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-background gap-2 sm:gap-4 ${
                  contract.status === "Warning" ? "border-destructive" : ""
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <AlertCircle
                    className={`h-4 w-4 ${
                      contract.status === "Warning" ? "text-red-500" : "text-muted-foreground"
                    }`}
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">Contract #{contract.id}</p>
                      {contract.status === "Active" && (
                        <Badge variant="secondary" className="bg-white text-black">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p
                      className={`text-sm ${
                        contract.status === "Warning" ? "text-red-600" : "text-muted-foreground"
                      }`}
                    >
                      {contract.type}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium ${
                      contract.status === "Warning" ? "text-red-600" : ""
                    }`}
                  >
                    ${contract.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}