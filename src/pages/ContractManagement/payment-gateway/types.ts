export interface PaymentMethod {
    id: string
    name: string
    icon: string
    isActive: boolean
  }
  
  export interface Transaction {
    id: string
    date: string
    amount: number
    method: string
    status: "completed" | "pending" | "failed"
    purpose: string
  }
  
  export type TabType = "make-payment" | "payment-methods" | "transaction-history"
  
  