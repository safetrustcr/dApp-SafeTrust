import React from "react";
import { MapPin, ZoomIn, ZoomOut, Navigation } from "lucide-react";

interface MapProps {
  coordinates: [number, number];
  hotelName: string;
}

export default function Map({ coordinates, hotelName }: MapProps) {
  const [lat, lng] = coordinates;

  return (
    <div className="relative w-full h-full min-h-[250px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 group">
      {/* Background grid pattern simulating map */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30" />
      
      {/* Curved decorative lines simulating streets */}
      <div className="absolute top-1/4 left-0 right-0 h-4 bg-slate-200/40 dark:bg-slate-800/40 -skew-y-12 border-t border-b border-slate-300/40 dark:border-slate-700/40" />
      <div className="absolute top-0 bottom-0 left-1/3 w-6 bg-slate-200/40 dark:bg-slate-800/40 skew-x-12 border-l border-r border-slate-300/40 dark:border-slate-700/40" />

      {/* Map Controls */}
      <div className="relative z-10 flex flex-col gap-1.5 self-end">
        <button className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950 transition-all shadow-sm">
          <ZoomIn className="h-4 w-4" />
        </button>
        <button className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950 transition-all shadow-sm">
          <ZoomOut className="h-4 w-4" />
        </button>
      </div>

      {/* Centered Hotel Pin Marker */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative flex items-center justify-center">
          {/* Pulsing ring animation */}
          <span className="absolute inline-flex h-14 w-14 rounded-full bg-blue-400 dark:bg-blue-600 opacity-20 animate-ping" />
          
          <div className="relative z-10 p-2.5 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center">
            <MapPin className="h-6 w-6" />
          </div>
          
          {/* Label tooltip */}
          <div className="absolute top-full mt-2.5 px-3 py-1.5 rounded-lg bg-slate-900/90 dark:bg-slate-950/90 text-white text-xs font-semibold whitespace-nowrap shadow-md pointer-events-auto">
            {hotelName}
          </div>
        </div>
      </div>

      {/* Map Footer showing coordinates */}
      <div className="relative z-10 p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-100 dark:border-slate-800 shadow-sm flex justify-between items-center w-fit self-start gap-3">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Navigation className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-[10px] font-mono tracking-tight font-medium">
            {lat.toFixed(4)}° N, {lng.toFixed(4)}° W
          </span>
        </div>
      </div>
    </div>
  );
}
