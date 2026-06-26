import { describe, expect, it } from 'vitest';
import { STUB_HOTELS } from '@/lib/mockData/hotels';
import { filterRentListings, toggleFilterValue } from './filterRentListings';

describe('toggleFilterValue', () => {
  it('adds and removes values from the filter set', () => {
    expect(toggleFilterValue(['Family'], 'Students')).toEqual([
      'Family',
      'Students',
    ]);
    expect(toggleFilterValue(['Family', 'Students'], 'Family')).toEqual([
      'Students',
    ]);
  });
});

describe('filterRentListings', () => {
  it('filters by category, location, bedrooms, and price', () => {
    const results = filterRentListings(STUB_HOTELS, {
      selectedCategories: ['Family'],
      selectedLocations: ['San José'],
      selectedBedrooms: '2',
      sortOption: 'relevance',
      minPrice: 4000,
      maxPrice: 4100,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('1');
  });

  it('sorts promoted listings first when using relevance', () => {
    const results = filterRentListings(STUB_HOTELS, {
      selectedCategories: [],
      selectedLocations: [],
      selectedBedrooms: 'all',
      sortOption: 'relevance',
      minPrice: 3200,
      maxPrice: 206000,
    });

    expect(results[0]?.promoted).toBe(true);
  });
});
