"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApartmentCardProps {
  id: string;
  name: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  petFriendly: boolean;
  isPromoted?: boolean;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
}

export function ApartmentCard({
  id, name, address, price, beds, baths,
  petFriendly, isPromoted = false,
  isFavorite = false, onFavoriteToggle,
}: ApartmentCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white
                    overflow-hidden hover:shadow-md
                    transition-shadow cursor-pointer">

      {/* Image placeholder */}
      <div className="relative h-40 bg-gradient-to-br
                      from-gray-200 to-gray-300">
        {isPromoted && (
          <span className="absolute bottom-2 left-2 bg-orange-500
                           text-white text-xs px-2 py-0.5
                           rounded-full font-medium
                           flex items-center gap-1">
            🔥 PROMOTED
          </span>
        )}
      </div>

      {/* Card info */}
      <div className="p-3 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-orange-500">
            ${price.toLocaleString()}.00
            <span className="text-xs font-normal text-gray-400">
              {" "}Per month
            </span>
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle?.(id);
            }}
          >
            <Heart className={cn(
              "h-4 w-4 transition-colors",
              isFavorite
                ? "fill-red-500 text-red-500"
                : "text-gray-300 hover:text-red-400"
            )} />
          </button>
        </div>
        <p className="text-sm font-semibold text-gray-900">
          {name}
        </p>
        <p className="text-xs text-gray-500 truncate">{address}</p>
        <div className="flex items-center gap-3 text-xs
                        text-gray-400 pt-1 border-t
                        border-gray-100">
          <span>🛏 {beds} bd</span>
          {petFriendly && <span>🐾 pet friendly</span>}
          <span>🚿 {baths} ba</span>
        </div>
      </div>
    </div>
  );
}
