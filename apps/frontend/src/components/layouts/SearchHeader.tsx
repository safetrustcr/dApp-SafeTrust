"use client";

import { Search } from "lucide-react";
import { useState } from "react";

export function SearchHeader() {
  const [query, setQuery] = useState("");

  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-full px-4 py-2 w-full">
      <div className="flex items-center gap-2 border-r border-gray-300 dark:border-gray-600 pr-3 shrink-0">
        <span className="text-sm text-gray-700 dark:text-gray-300">Rent</span>
        <svg
          className="w-3 h-3 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      <input
        type="text"
        id="search-input"
        aria-label="Search by city or province"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="City, province..."
        className="bg-transparent text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 outline-none flex-1 min-w-0"
      />
      <Search className="w-4 h-4 text-gray-500 shrink-0" />
    </div>
  );
}
