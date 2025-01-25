import { Service, ServiceStatus } from "@/types/service";

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
