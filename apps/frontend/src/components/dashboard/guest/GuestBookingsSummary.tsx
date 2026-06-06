import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Hotel, ShieldCheck } from "lucide-react";

export default function GuestBookingsSummary() {
  const bookings = [
    {
      id: "BK-9482",
      hotelName: "Grand Oasis Resort",
      dates: "June 15 - June 22, 2026",
      nights: 7,
      amount: "$1,200.00 USDC",
      status: "SECURED",
      escrowId: "tw-escrow-00482",
    },
    {
      id: "BK-1052",
      hotelName: "Shikara Hotel",
      dates: "July 14 - August 2, 2026",
      nights: 19,
      amount: "$763.42 USDC",
      status: "PENDING DEPOSIT",
      escrowId: null,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">My Hotel Bookings</h3>
        <p className="text-xs text-slate-400">Track and manage your upcoming stays secured via decentralised P2P escrow</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {bookings.map((booking) => (
          <Card key={booking.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-5 flex flex-col justify-between gap-4 h-full">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-100 dark:border-blue-900/30">
                    <Hotel className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{booking.hotelName}</h4>
                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" /> {booking.dates} ({booking.nights} nights)
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    booking.status === "SECURED"
                      ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 border-emerald-200 font-semibold text-[10px]"
                      : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 border-amber-200 font-semibold text-[10px]"
                  }
                >
                  {booking.status}
                </Badge>
              </div>

              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mt-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Escrow Amount</span>
                  <span className="text-sm font-extrabold text-slate-850 dark:text-slate-200">{booking.amount}</span>
                </div>
                {booking.escrowId ? (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1 justify-end">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" /> Stellar Mirror
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{booking.escrowId}</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider hover:underline cursor-pointer">
                    Secure Now →
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
