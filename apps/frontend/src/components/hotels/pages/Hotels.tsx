"use client";

import React, { useState } from "react";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, MapPin, Bed, Bath, Star, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/layouts/Header";

export default function Hotels() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const hotels = [
    {
      id: "demo-apartment-booking",
      name: "Grand Oasis Resort",
      location: "San José, Costa Rica",
      price: "$1,200.00 USDC",
      rating: 4.9,
      beds: 3,
      baths: 2,
      imageUrl: "/img/room1.png",
      badge: "Best Seller",
    },
    {
      id: "demo-apartment-2",
      name: "Shikara Hotel",
      location: "San José, Costa Rica",
      price: "$40.18 USDC",
      rating: 5.0,
      beds: 2,
      baths: 1,
      imageUrl: "/img/room2.png",
      badge: "Escrow Ready",
    },
  ];

  const handleSelectHotel = (id: string) => {
    router.push("/dashboard/hotel/payment"); // Direct to booking payment page as per layout routes
  };

  return (
    <div className="space-y-8 w-full max-w-7xl mx-auto px-4 md:px-8 py-8">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Find a place to stay</h1>
          <p className="text-sm text-slate-500 mt-1">
            Book fully verified rooms and secure deposits directly on-chain via smart P2P escrow.
          </p>
        </div>
      </div>

      {/* Filter and search bars */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-sm">
        <div className="flex-1 relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by city, hotel name or region..."
            className="pl-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 font-semibold px-6">
          Find Hotel
        </Button>
      </div>

      {/* Hotel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {hotels.map((hotel) => (
          <Card key={hotel.id} className="group border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-all rounded-2xl">
            <CardContent className="p-0 flex flex-col sm:flex-row h-full">
              {/* Image box */}
              <div className="relative w-full sm:w-[220px] aspect-[4/3] sm:aspect-auto shrink-0 bg-slate-100 dark:bg-slate-850 overflow-hidden">
                <Image
                  src={hotel.imageUrl}
                  alt={hotel.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <button className="absolute top-3 right-3 p-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:bg-white transition-all shadow-sm">
                  <Heart className="h-4 w-4 text-slate-500 hover:text-red-500 transition-colors" />
                </button>
                {hotel.badge && (
                  <Badge className="absolute top-3 left-3 bg-blue-600/90 hover:bg-blue-600 backdrop-blur-sm text-white border-none font-bold text-[10px]">
                    {hotel.badge}
                  </Badge>
                )}
              </div>

              {/* Text content details */}
              <div className="p-5 flex flex-col justify-between flex-1 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Hotel Room</span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                      <span>{hotel.rating}</span>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base group-hover:text-blue-600 transition-colors">
                    {hotel.name}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {hotel.location}
                  </p>

                  <div className="flex gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-1 flex-wrap">
                    <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-semibold">
                      <Bed className="h-4 w-4 text-slate-450" /> {hotel.beds} Beds
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-semibold">
                      <Bath className="h-4 w-4 text-slate-450" /> {hotel.baths} Bath
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80 pt-4 flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Price Per Night</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">{hotel.price}</span>
                  </div>
                  <Button onClick={() => handleSelectHotel(hotel.id)} className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white text-xs font-bold gap-1 rounded-xl h-9">
                    Book Room <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
