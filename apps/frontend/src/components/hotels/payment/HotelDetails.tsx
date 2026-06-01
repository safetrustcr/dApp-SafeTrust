import React from "react";
import Image from "next/image";
import { Bed, Bath, Star, MapPin, ShieldCheck, Heart } from "lucide-react";
import HotelMap from "./Map";

interface HotelDetailsProps {
  hotelName: string;
  description: string;
  details: string;
  goodToKnow: string;
  location: string;
  coordinates: [number, number];
  rating: number;
  beds: number;
  baths: number;
  imageUrl: string;
}

export default function HotelDetails({
  hotelName,
  description,
  details,
  goodToKnow,
  location,
  coordinates,
  rating,
  beds,
  baths,
  imageUrl,
}: HotelDetailsProps) {
  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-250">
              Highly Rated
            </span>
            <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span>{rating.toFixed(1)} Rating</span>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
            {hotelName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{description}</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950 transition-all shadow-sm">
            <Heart className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Image Grid */}
      <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-md bg-slate-100 dark:bg-slate-800">
        <Image
          src={imageUrl}
          alt={hotelName}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 80vw"
          className="object-cover"
        />
      </div>

      {/* Quick Amenities Icons */}
      <div className="flex flex-wrap gap-4 py-4 border-t border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <Bed className="h-5 w-5 text-slate-400" />
          <span className="text-sm font-semibold">{beds} Bedrooms</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-355 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <Bath className="h-5 w-5 text-slate-400" />
          <span className="text-sm font-semibold">{baths} Bathroom</span>
        </div>
      </div>

      {/* Rich Details section */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2.5">
            About this space
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
            {details}
          </p>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2.5">
            Good to know
          </h3>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
            {goodToKnow}
          </p>
        </div>
      </div>

      {/* Map Segment */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin className="h-5 w-5 text-slate-400" />
          Where you&apos;ll be
        </h3>
        <div className="h-[250px] w-full">
          <HotelMap coordinates={coordinates} hotelName={hotelName} />
        </div>
        <p className="text-xs text-slate-400 font-medium leading-relaxed mt-2 flex items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" /> Property address and host credentials are fully registered on the Stellar blockhain.
        </p>
      </div>
    </div>
  );
}
