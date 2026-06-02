"use client";

interface PriceRangeFilterProps {
  minPrice: number;
  maxPrice: number;
}

export function PriceRangeFilter({
  minPrice,
  maxPrice,
}: PriceRangeFilterProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-800">Price Range</h2>
      <p className="text-sm text-gray-500">
        ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}
      </p>
      <div className="h-2 rounded-full bg-orange-100">
        <div className="h-2 w-3/4 rounded-full bg-orange-500" />
      </div>
    </section>
  );
}
