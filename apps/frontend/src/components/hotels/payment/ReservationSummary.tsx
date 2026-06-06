import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ShieldAlert } from "lucide-react";
import { EscrowPayFlow } from "@/components/escrow/EscrowPayFlow";

interface ReservationSummaryProps {
  hotelName: string;
  description: string;
  price: number;
  tax: number;
  checkIn: Date;
  checkOut: Date;
}

export default function ReservationSummary({
  hotelName,
  description,
  price,
  tax,
  checkIn,
  checkOut,
}: ReservationSummaryProps) {
  // Calculate total nights
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  const roomCharge = price * nights;
  const serviceFee = tax;
  const total = roomCharge + serviceFee;

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xl sticky top-24 overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500" />
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Reservation Summary
          </CardTitle>
          <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 border-indigo-200">
            Escrow Secure
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Booking details */}
        <div>
          <h4 className="text-sm font-semibold text-slate-850 dark:text-slate-200">{hotelName}</h4>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>

        {/* Date selections */}
        <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" /> Check In
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {checkIn.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="space-y-1 border-l border-slate-200 dark:border-slate-800/80 pl-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-400" /> Check Out
            </span>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {checkOut.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">${price.toFixed(2)} x {nights} nights</span>
            <span className="font-semibold text-slate-900 dark:text-white">${roomCharge.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Stellar Platform fee</span>
            <span className="font-semibold text-slate-900 dark:text-white">${serviceFee.toFixed(2)}</span>
          </div>
          <div className="h-px bg-slate-200/60 dark:bg-slate-800/60 my-3" />
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-slate-850 dark:text-slate-250">Total (USDC)</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Secure pay flow component */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
          <EscrowPayFlow
            apartmentId="demo-apartment-booking"
            apartmentName={hotelName}
            ownerAddress="GBV4UX2LMRK7PND4G5MXCY7LCPXNXQ7HNS3TLJ3FNDUXE5HHYT3LQ55Q"
            amount={total}
          />
        </div>
      </CardContent>
      <CardFooter className="bg-slate-50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/80 px-6 py-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 text-center">
        <ShieldAlert className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        Your funds will be held securely in Stellar blockchain escrow.
      </CardFooter>
    </Card>
  );
}
