"use client";

import { cn } from "@/lib/utils";

const TABS = [
  { label: "All apartments", value: "all" },
  { label: "1 bedroom", value: "1" },
  { label: "2 bedrooms", value: "2" },
  { label: "3 bedrooms", value: "3" },
];

interface BedroomTabsProps {
  selected: string;
  onChange: (value: string) => void;
}

export function BedroomTabs({ selected, onChange }: BedroomTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm transition-colors",
            selected === tab.value
              ? "border-gray-950 bg-gray-950 text-white"
              : "border-gray-300 bg-white text-gray-600 hover:border-gray-500"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
