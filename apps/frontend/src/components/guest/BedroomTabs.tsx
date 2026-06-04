"use client";

import { cn } from "@/lib/utils";

const TABS = [
  { label: "All apartments", value: "all" },
  { label: "1 bedroom",      value: "1" },
  { label: "2 bedrooms",     value: "2" },
  { label: "3 bedrooms",     value: "3" },
];

interface BedroomTabsProps {
  selected: string;
  onChange: (v: string) => void;
}

export function BedroomTabs({ selected, onChange }: BedroomTabsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm border",
            "transition-colors",
            selected === tab.value
              ? "bg-gray-900 text-white border-gray-900"
              : "bg-white text-gray-600 border-gray-300",
            "hover:border-gray-500"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
