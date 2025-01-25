"use client";

import { useState, useMemo } from "react";
import { Download, Search, Calendar, Clock, Filter, Tag, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Types
export enum ServiceStatus {
  Completed = "completed",
  InProgress = "in-progress",
  Pending = "pending",
  Scheduled = "scheduled",
  Cancelled = "cancelled",
}

export interface Service {
  id: string
  type: string
  provider: string
  status: ServiceStatus
  date: string
  cost: number
  location: string
  description: string
}

// Mock data
export const serviceHistory: Service[] = [
  {
    id: "SRV-001",
    type: "Maintenance",
    provider: "Tech Solutions Inc",
    status: ServiceStatus.Completed,
    date: "2025-01-20",
    cost: 450.00,
    location: "New York, NY",
    description: "Regular system maintenance and updates"
  },
  {
    id: "SRV-002",
    type: "Repair",
    provider: "QuickFix Services",
    status: ServiceStatus.Pending,
    date: "2024-10-18",
    cost: 850.00,
    location: "Los Angeles, CA",
    description: "Emergency hardware replacement"
  },
  {
    id: "SRV-003",
    type: "Installation",
    provider: "Network Pro LLC",
    status: ServiceStatus.InProgress,
    date: "2024-11-15",
    cost: 1200.00,
    location: "Chicago, IL",
    description: "New security system installation"
  },
  {
    id: "SRV-004",
    type: "Inspection",
    provider: "Safety First Co",
    status: ServiceStatus.Scheduled,
    date: "2024-12-31",
    cost: 300.00,
    location: "Miami, FL",
    description: "Annual safety inspection"
  }
]
// ServiceHistoryTable component
const statusStyles = {
  completed: "bg-green-500/15 text-green-500",
  "in-progress": "bg-blue-500/15 text-blue-500",
  pending: "bg-yellow-500/15 text-yellow-500",
  cancelled: "bg-red-500/15 text-red-500",
  scheduled: "bg-gray-500/15 text-gray-500",
}

export function ServiceHistoryTable({ services }: { services: Service[] }) {
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

// ServiceHistoryPage component
const getDiffDays = (date1: Date, date2: Date) =>
  Math.ceil(Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24))

export default function ServiceHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")

  const filteredServices = useMemo(() => {
    return serviceHistory.filter((service) => {
      const matchesSearch =
        service.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.provider.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesStatus = statusFilter === "all" || service.status === statusFilter

      if (dateFilter === "all") return matchesSearch && matchesStatus

      const serviceDate = new Date(service.date)
      const today = new Date()
      const diffDays = getDiffDays(today, serviceDate)

      switch (dateFilter) {
        case "7days":
          return matchesSearch && matchesStatus && diffDays <= 7
        case "30days":
          return matchesSearch && matchesStatus && diffDays <= 30
        case "90days":
          return matchesSearch && matchesStatus && diffDays <= 90
        case "365days":
          return matchesSearch && matchesStatus && diffDays <= 365
        default:
          return matchesSearch && matchesStatus
      }
    })
  }, [searchQuery, statusFilter, dateFilter])

  const handleDownload = () => {
    const headers = ["Service ID,Type,Provider,Date,Status,Amount\n"]
    const csvData = filteredServices.map(
      (service) =>
        `${service.id},${service.type},${service.provider},${service.date},${service.status},${service.cost}\n`,
    )
    const blob = new Blob([...headers, ...csvData], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.setAttribute("href", url)
    a.setAttribute("download", "service-history.csv")
    a.click()
  }

  return (
    <div className="min-h-[calc(100vh-129px)] bg-background p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Service History</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleDownload} aria-label="Download service history">
            <Download className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button>New Service Request</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Filter Services</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4" aria-hidden="true" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search services"
              className="text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger aria-label="Filter by date">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 3 Months</SelectItem>
              <SelectItem value="365days">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <ServiceHistoryTable services={filteredServices} />
    </div>
  )
}
