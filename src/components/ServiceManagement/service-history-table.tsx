import { Calendar, Clock, Filter, Tag, User } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { Service, ServiceStatus } from "@/types/service"

interface ServiceHistoryTableProps {
  services: Service[]
}

const statusStyles = {
  completed: "bg-green-500/15 text-green-500",
  "in-progress": "bg-blue-500/15 text-blue-500",
  pending: "bg-yellow-500/15 text-yellow-500",
  cancelled: "bg-red-500/15 text-red-500",
  scheduled: "bg-gray-500/15 text-gray-500",
}

export function ServiceHistoryTable({ services }: ServiceHistoryTableProps) {
  return (
    <div className="rounded-lg border overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="p-4">Service ID</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="w-[50px] p-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => (
            <TableRow key={service.id}>
              <TableCell className="p-4 min-w-[110px]">{service.id}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" aria-hidden="true" />
                  {service.type}
                </div>
              </TableCell>
              <TableCell className="min-w-[170px]">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" aria-hidden="true" />
                  {service.provider}
                </div>
              </TableCell>
              <TableCell className="min-w-[120px]">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  {service.date}
                </div>
              </TableCell>
              <TableCell className="min-w-[140px]">
                <Badge variant="secondary" className={statusStyles[service.status as ServiceStatus]}>
                  <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>${service.cost.toFixed(2)}</TableCell>
              <TableCell align="center">
                <Filter className="h-4 w-4" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
