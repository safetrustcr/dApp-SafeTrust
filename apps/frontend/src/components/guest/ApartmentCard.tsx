"use client";

import Image from "next/image";
import { Bath, BedDouble, Heart, PawPrint, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApartmentCardProps {
  id: string;
  name: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  petFriendly: boolean;
  imageSrc: string;
  isPromoted?: boolean;
  isFavorite?: boolean;
  onFavoriteToggle?: (id: string) => void;
}

export function ApartmentCard({
  id,
  name,
  address,
  price,
  beds,
  baths,
  petFriendly,
  imageSrc,
  isPromoted = false,
  isFavorite = false,
  onFavoriteToggle,
}: ApartmentCardProps) {
  return (
    <article className="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md">
      <div className="relative h-40 bg-gray-100">
        <Image
          src={imageSrc}
          alt={name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        {isPromoted && (
          <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-orange-500 px-2 py-1 text-[11px] font-semibold uppercase text-white">
            <Flame className="h-3 w-3" />
            Promoted
          </span>
        )}
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-orange-500">
            ${price.toLocaleString()}.00
            <span className="ml-1 text-xs font-normal text-gray-400">
              Per month
            </span>
          </p>
          <button
            type="button"
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            onClick={(event) => {
              event.stopPropagation();
              onFavoriteToggle?.(id);
            }}
            className="rounded-full p-1 text-gray-300 transition-colors hover:text-red-400"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                isFavorite && "fill-red-500 text-red-500"
              )}
            />
          </button>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-gray-950">{name}</h2>
          <p className="truncate text-xs text-gray-500">{address}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5 text-orange-400" />
            {beds} bd
          </span>
          {petFriendly && (
            <span className="flex items-center gap-1">
              <PawPrint className="h-3.5 w-3.5 text-orange-400" />
              pet friendly
            </span>
          )}
          <span className="flex items-center gap-1">
            <Bath className="h-3.5 w-3.5 text-orange-400" />
            {baths} ba
          </span>
        </div>
      </div>
    </article>
  );
}
