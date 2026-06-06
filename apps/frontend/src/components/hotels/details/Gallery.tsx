import React, { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GalleryProps {
  images: string[];
}

export default function Gallery({ images }: GalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Main Large Image */}
      <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-md group bg-slate-100 dark:bg-slate-800">
        <Image
          src={images[activeIndex]}
          alt={`Hotel view ${activeIndex + 1}`}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 80vw"
          className="object-cover transition-all duration-500 ease-in-out"
        />
        
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-850 hover:bg-white dark:hover:bg-slate-950 transition-all shadow-md opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-slate-850 hover:bg-white dark:hover:bg-slate-950 transition-all shadow-md opacity-0 group-hover:opacity-100"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`relative h-20 w-32 shrink-0 rounded-xl overflow-hidden border-2 transition-all shadow-sm ${
                activeIndex === index
                  ? "border-blue-500 scale-95 ring-2 ring-blue-500/20"
                  : "border-transparent hover:border-slate-300"
              }`}
            >
              <Image
                src={img}
                alt={`Thumbnail ${index + 1}`}
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
