import React from "react";
import { Bed, Bath, FileText } from "lucide-react";

interface DetailsProps {
  beds: number;
  baths: number;
  description: string;
}

export default function Details({ beds, baths, description }: DetailsProps) {
  return (
    <div className="flex flex-col gap-5 w-full bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-full justify-between">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-400" />
          About this property
        </h3>
        <p className="text-slate-600 dark:text-slate-350 text-sm leading-relaxed font-normal">
          {description}
        </p>
      </div>

      <div className="flex gap-6 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <Bed className="h-5 w-5 text-slate-450" />
          </div>
          <span className="text-sm font-semibold">{beds} Bedrooms</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <Bath className="h-5 w-5 text-slate-450" />
          </div>
          <span className="text-sm font-semibold">{baths} Bathroom</span>
        </div>
      </div>
    </div>
  );
}
