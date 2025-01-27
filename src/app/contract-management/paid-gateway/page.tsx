import PaymentGateway from "@/pages/ContractManagement/payment-gateway/payment-gateway"
import { Suspense } from "react"


export default function PaidGatewayPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Payment Gateway</h1>
        <p className="text-muted-foreground">
          Configure your payment gateway settings for contract management
        </p>
      </div>
      
      <Suspense fallback={<div>Loading payment gateway...</div>}>
        <PaymentGateway />
      </Suspense>
    </div>
  )
}
