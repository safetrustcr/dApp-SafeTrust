import type { HotelListing } from '@/@types/hotel';

export type SortOption = 'relevance' | 'price-low' | 'price-high';

export interface RentListingFilters {
  selectedCategories: string[];
  selectedLocations: string[];
  selectedBedrooms: string;
  sortOption: SortOption;
  minPrice: number;
  maxPrice: number;
}

export function toggleFilterValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function filterRentListings(
  listings: HotelListing[],
  filters: RentListingFilters,
): HotelListing[] {
  const apartments = listings.filter((apartment) => {
    const matchesCategory =
      filters.selectedCategories.length === 0 ||
      filters.selectedCategories.includes(apartment.category);
    const matchesLocation =
      filters.selectedLocations.length === 0 ||
      filters.selectedLocations.includes(apartment.location);
    const matchesBedroom =
      filters.selectedBedrooms === 'all' ||
      apartment.bedrooms === Number(filters.selectedBedrooms);
    const matchesPrice =
      apartment.price >= filters.minPrice && apartment.price <= filters.maxPrice;

    return (
      matchesCategory && matchesLocation && matchesBedroom && matchesPrice
    );
  });

  if (filters.sortOption === 'price-low') {
    return [...apartments].sort((left, right) => left.price - right.price);
  }

  if (filters.sortOption === 'price-high') {
    return [...apartments].sort((left, right) => right.price - left.price);
  }

  return [...apartments].sort(
    (left, right) => Number(right.promoted) - Number(left.promoted),
  );
}
