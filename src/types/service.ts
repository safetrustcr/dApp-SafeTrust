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
