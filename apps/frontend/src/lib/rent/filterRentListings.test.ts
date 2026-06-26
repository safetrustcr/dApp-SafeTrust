import type { HotelListing } from '@/@types/hotel';
import { describe, expect, it } from 'vitest';
import { filterRentListings, toggleFilterValue } from './filterRentListings';

const TEST_LISTINGS: HotelListing[] = [
  {
    id: 'a',
    name: 'Promoted family home',
    address: '1 Main St, San José',
    price: 4050,
    bedrooms: 2,
    bathrooms: 1,
    petFriendly: true,
    promoted: true,
    images: ['/img/hotel/hotel1.jpg'],
    category: 'Family',
    location: 'San José',
    owner: { name: 'Owner A', avatar: '/img/person.png' },
    description: 'Test listing A',
    favorite: false,
  },
  {
    id: 'b',
    name: 'Student flat',
    address: '2 Oak Ave, Heredia',
    price: 3900,
    bedrooms: 1,
    bathrooms: 1,
    petFriendly: false,
    promoted: false,
    images: ['/img/hotel/hotel1.jpg'],
    category: 'Students',
    location: 'Heredia',
    owner: { name: 'Owner B', avatar: '/img/person.png' },
    description: 'Test listing B',
    favorite: true,
  },
  {
    id: 'c',
    name: 'Traveler studio',
    address: '3 Pine Rd, Alajuela',
    price: 4200,
    bedrooms: 3,
    bathrooms: 2,
    petFriendly: true,
    promoted: false,
    images: ['/img/hotel/hotel1.jpg'],
    category: 'Travelers',
    location: 'Alajuela',
    owner: { name: 'Owner C', avatar: '/img/person.png' },
    description: 'Test listing C',
    favorite: false,
  },
];

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
    const results = filterRentListings(TEST_LISTINGS, {
      selectedCategories: ['Family'],
      selectedLocations: ['San José'],
      selectedBedrooms: '2',
      sortOption: 'relevance',
      minPrice: 4000,
      maxPrice: 4100,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('a');
  });

  it('sorts promoted listings first when using relevance', () => {
    const results = filterRentListings(TEST_LISTINGS, {
      selectedCategories: [],
      selectedLocations: [],
      selectedBedrooms: 'all',
      sortOption: 'relevance',
      minPrice: 3000,
      maxPrice: 5000,
    });

    expect(results[0]?.promoted).toBe(true);
    expect(results[0]?.id).toBe('a');
  });
});
