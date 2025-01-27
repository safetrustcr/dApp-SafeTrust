"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentDetails } from "./payment-details";
import { PaymentSummary } from "./payment-summary";
import { TransactionHistory } from "./transaction-history";
import { PaymentMethods } from "./payment-methods";
import type { PaymentMethod, Transaction, TabType } from "./types";

const mockPaymentMethods: PaymentMethod[] = [
  {
    id: "cc",
    name: "Credit Card",
    icon: "credit-card",
    isActive: true,
  },
  {
    id: "ew",
    name: "E-Wallet",
    icon: "wallet",
    isActive: true,
  },
  {
    id: "crypto",
    name: "Crypto",
    icon: "bitcoin",
    isActive: true,
  },
];

const mockTransactions: Transaction[] = [
  {
    id: "tx1",
    date: "2025-01-20",
    amount: 299.99,
    method: "Credit Card",
    status: "completed",
    purpose: "Software License",
  },
  {
    id: "tx2",
    date: "2025-01-19",
    amount: 149.5,
    method: "E-Wallet",
    status: "pending",
    purpose: "Subscription",
  },
];

const mockPurposes = [
  "Software License",
  "Subscription",
  "One-time Purchase",
  "Service Fee",
  "Other",
];

export default function PaymentGateway() {
  const [activeTab, setActiveTab] = useState<TabType>("make-payment");
  const [amount, setAmount] = useState<string>("0.00");
  const [selectedMethod, setSelectedMethod] = useState<string>("cc");
  const [purpose, setPurpose] = useState<string>("");

  const processingFee = Number(amount) * 0.029 + 0.3;
  const total = Number(amount) + processingFee;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Payment Gateway</h1>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabType)}
      >
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="make-payment">Make Payment</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="transaction-history">
            Transaction History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="make-payment">
          <div className="grid md:grid-cols-2 gap-6">
            <PaymentDetails
              paymentMethods={mockPaymentMethods}
              purposes={mockPurposes}
              selectedMethod={selectedMethod}
              amount={amount}
              purpose={purpose}
              onMethodChange={setSelectedMethod}
              onAmountChange={setAmount}
              onPurposeChange={setPurpose}
            />
            <PaymentSummary
              amount={Number(amount)}
              processingFee={processingFee}
              total={total}
            />
          </div>
        </TabsContent>

        <TabsContent value="payment-methods">
          <PaymentMethods methods={mockPaymentMethods} />
        </TabsContent>

        <TabsContent value="transaction-history">
          <TransactionHistory transactions={mockTransactions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
