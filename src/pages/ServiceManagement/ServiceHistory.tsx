"use client"

import { useMemo, useState } from "react"
import { Download, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ServiceHistoryTable } from "@/components/ServiceManagement/service-history-table"
import { serviceHistory } from "@/data/serviceHistory"

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
    <div className="min-h-[calc(100vh-102px)] bg-background p-6 space-y-6">
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
