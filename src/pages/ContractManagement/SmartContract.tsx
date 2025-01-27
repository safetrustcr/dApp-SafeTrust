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
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Clock, Bell, AlertTriangle } from "lucide-react";

const mockContracts = [
  {
    id: "SC-2401",
    deposit: 2500.0,
    status: "active",
    createdDate: "2024-01-20",
    lastEvent: "Deposit Confirmed",
  },
  {
    id: "SC-2400",
    deposit: 1800.0,
    status: "pending",
    createdDate: "2024-01-19",
    lastEvent: "Awaiting Signature",
  },
  {
    id: "SC-2399",
    deposit: 3200.0,
    status: "disputed",
    createdDate: "2024-01-18",
    lastEvent: "Dispute Filed",
  },
];

const metricsData = [
  {
    title: "Total Value Locked",
    value: "$45,231.89",
    description: "+20.1% from last month",
    icon: <Lock className="w-5 h-5"/>,
  },
  {
    title: "Active Contracts",
    value: "24",
    description: "3 pending execution",
    icon: <Clock className="w-5 h-5"/>,
  },
  {
    title: "Contract Events",
    value: "12",
    description: "5 require attention",
    icon: <Bell className="w-5 h-5" />,
  },
  {
    title: "Disputes",
    value: "3",
    description: "1 critical review needed",
    icon: <AlertTriangle className="w-5 h-5" />,
  },
];

const statusColors: { [key: string]: string } = {
  active:
    "bg-green-100 text-green-800 dark:bg-[rgb(14,40,26)] dark:text-[rgb(57,133,79)]",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-[rgb(36,24,0)] dark:text-[rgb(154,105,34)]",
  disputed:
    "bg-red-100 text-red-800 dark:bg-[rgb(58,38,39)] dark:text-[rgb(207,98,80)]",
};

export default function SmartContract() {
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Add your dashboard content here */}
          {metricsData.map((metric, index) => (
        <Card key={index} className="bg-background rounded-lg shadow-lg relative w-64">
          <CardHeader>
            <CardTitle className="flex justify-between items-center text-md font-semibold">
              {metric.title}
              <span className="text-gray-400 text-md">{metric.icon}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metric.value}</p>
            <p className="text-sm text-gray-400 mt-2">{metric.description}</p>
          </CardContent>
        </Card>
      ))}
        </div>
        <div>
          <div className="p-6 bg-background text-card-foreground shadow-lg rounded-lg border">
            <h2 className="text-lg font-semibold mb-4">Recent Contracts</h2>
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-muted">
                  <TableHead className="text-left text-muted-foreground">
                    Contract ID
                  </TableHead>
                  <TableHead className="text-left text-muted-foreground">
                    Deposit Amount
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
                {mockContracts.map((contract) => (
                  <TableRow
                    key={contract.id}
                    className="py-4 border-b border-muted hover:bg-muted/20"
                  >
                    <TableCell className="font-medium">{contract.id}</TableCell>
                    <TableCell>{contract.deposit}</TableCell>
                    <TableCell>
                      <Badge
                        className={`rounded-full px-3 py-1 ${
                          statusColors[contract.status]
                        }`}
                      >
                        {contract.status.charAt(0).toUpperCase() +
                          contract.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{contract.createdDate}</TableCell>
                    <TableCell>{contract.lastEvent}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
