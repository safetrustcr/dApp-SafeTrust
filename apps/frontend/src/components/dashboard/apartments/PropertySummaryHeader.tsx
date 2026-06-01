import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Bed, Bath, MapPin } from "lucide-react";

interface PropertySummaryHeaderProps {
  name: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  price: number;
}

export function PropertySummaryHeader({
  name,
  address,
  bedrooms,
  bathrooms,
  price,
}: PropertySummaryHeaderProps) {
  return (
    <Card className="overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{name}</h1>
            <div className="flex items-center text-slate-500 dark:text-slate-400 gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="text-sm font-medium">{address}</span>
            </div>
          </div>
          <div className="flex items-center gap-6 shrink-0">
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Bed className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-semibold">{bedrooms} Bed</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <Bath className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-semibold">{bathrooms} Bath</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Monthly Rent</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">${price}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
