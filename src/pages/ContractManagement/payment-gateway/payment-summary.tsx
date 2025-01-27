import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"

interface PaymentSummaryProps {
  amount: number
  processingFee: number
  total: number
}

export function PaymentSummary({ amount, processingFee, total }: PaymentSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span>${amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Processing Fee</span>
            <span>${processingFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-medium">Secure Payment</span>
          </div>
          <p className="text-sm text-muted-foreground">
            All payments are processed securely using industry-standard encryption. Your financial information is never
            stored on our servers.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

