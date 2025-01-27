import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bitcoin, CreditCard, Wallet } from "lucide-react"
import type { PaymentMethod } from "./types"

interface PaymentMethodsProps {
  methods: PaymentMethod[]
}

export function PaymentMethods({ methods }: PaymentMethodsProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "credit-card":
        return <CreditCard className="h-6 w-6" />
      case "wallet":
        return <Wallet className="h-6 w-6" />
      case "bitcoin":
        return <Bitcoin className="h-6 w-6" />
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Methods</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {methods.map((method) => (
            <div key={method.id} className="flex items-center p-4 rounded-lg border">
              <div className="mr-4">{getIcon(method.icon)}</div>
              <div>
                <h3 className="font-medium">{method.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {method.isActive ? "Available for payments" : "Currently unavailable"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}