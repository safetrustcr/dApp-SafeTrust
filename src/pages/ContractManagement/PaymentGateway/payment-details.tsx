import { Bitcoin, CreditCard, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentMethod } from "./types";

interface PaymentDetailsProps {
  paymentMethods: PaymentMethod[];
  purposes: string[];
  selectedMethod: string;
  amount: string;
  purpose: string;
  onMethodChange: (method: string) => void;
  onAmountChange: (amount: string) => void;
  onPurposeChange: (purpose: string) => void;
}

export function PaymentDetails({
  paymentMethods,
  purposes,
  selectedMethod,
  amount,
  purpose,
  onMethodChange,
  onAmountChange,
  onPurposeChange,
}: PaymentDetailsProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "credit-card":
        return <CreditCard className="h-6 w-6" />;
      case "wallet":
        return <Wallet className="h-6 w-6" />;
      case "bitcoin":
        return <Bitcoin className="h-6 w-6" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Details</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose your payment method and enter the amount
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
          <label className="text-sm font-medium">Select Payment Method</label>
          <div className="grid grid-cols-3 gap-4">
            {paymentMethods.map((method) => (
              // biome-ignore lint/a11y/useButtonType: <explanation>
              <button
                key={method.id}
                onClick={() => onMethodChange(method.id)}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-colors ${
                  selectedMethod === method.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {getIcon(method.icon)}
                <span className="mt-2 text-sm">{method.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5">$</span>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => onAmountChange(e.target.value)}
              className="pl-7"
              placeholder="0.00"
              step="0.01"
            />
          </div>
        </div>

        <div className="space-y-2">
          {/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
          <label className="text-sm font-medium">Payment Purpose</label>
          <Select value={purpose} onValueChange={onPurposeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select purpose" />
            </SelectTrigger>
            <SelectContent>
              {purposes.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button className="w-full" size="lg">
          Proceed to Payment
        </Button>
      </CardContent>
    </Card>
  );
}
