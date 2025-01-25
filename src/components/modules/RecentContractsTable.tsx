import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const mockContracts = [
  {
    id: "SC-2401",
    deposit: 2500.00,
    status: "active",
    createdDate: "2024-01-20",
    lastEvent: "Deposit Confirmed"
  },
  {
    id: "SC-2400",
    deposit: 1800.00,
    status: "pending",
    createdDate: "2024-01-19",
    lastEvent: "Awaiting Signature"
  },
  {
    id: "SC-2399",
    deposit: 3200.00,
    status: "disputed",
    createdDate: "2024-01-18",
    lastEvent: "Dispute Filed"
  }
];

const statusColors: { [key: string]: string } = {
  active: "bg-green-100 text-green-800 dark:bg-[rgb(14,40,26)] dark:text-[rgb(57,133,79)]",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-[rgb(36,24,0)] dark:text-[rgb(154,105,34)]",
  disputed: "bg-red-100 text-red-800 dark:bg-[rgb(58,38,39)] dark:text-[rgb(207,98,80)]",
};

const RecentContractsTable = () => {
  return (
    <div className="p-6 bg-background text-card-foreground shadow-lg rounded-lg border">
      <h2 className="text-lg font-semibold mb-4">Recent Contracts</h2>
      <Table className="w-full">
        <TableHeader>
          <TableRow className="border-b border-muted">
            <TableHead className="text-left text-muted-foreground">Contract ID</TableHead>
            <TableHead className="text-left text-muted-foreground">Deposit Amount</TableHead>
            <TableHead className="text-left text-muted-foreground">Status</TableHead>
            <TableHead className="text-left text-muted-foreground">Created Date</TableHead>
            <TableHead className="text-left text-muted-foreground">Last Event</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockContracts.map((contract) => (
            <TableRow key={contract.id} className="py-4 border-b border-muted hover:bg-muted/20">
              <TableCell className="font-medium">{contract.id}</TableCell>
              <TableCell>{contract.deposit}</TableCell>
              <TableCell>
                <Badge className={`rounded-full px-3 py-1 ${statusColors[contract.status]}`}> 
                  {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>{contract.createdDate}</TableCell>
              <TableCell>{contract.lastEvent}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RecentContractsTable;
