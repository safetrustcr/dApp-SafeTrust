import React from "react";
import { MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InformationProps {
  name: string;
  location: string;
  price: string;
}

export default function Information({ name, location, price }: InformationProps) {
  return (
    <div className="flex flex-col gap-3 w-full bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-150 hover:bg-blue-100 font-semibold">
              Verified Host
            </Badge>
            <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span>5.0</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
            {name}
          </h1>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Per Night</p>
          <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 leading-none mt-1">
            {price}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 mt-2">
        <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
        <span className="text-sm font-medium leading-relaxed">{location}</span>
      </div>
    </div>
  );
}
