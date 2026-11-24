import { describe, expect, it } from 'vitest';
import type { PublicRentalProperty } from '@safetrust/types';
import { propertyToListing } from './property-listing';
import { filterRentListings } from './filterRentListings';
const property: PublicRentalProperty = { id: 'apt', kind: 'apartment', name: 'Apartment', address: 'San Jose', city: '', price: 1200, description: null, images: [] };
describe('database property cards', () => {
  it('shows saved apartments below the old mock minimum price', () => {
    const listing = propertyToListing(property);
    expect(listing.location).toBe('San José');
    expect(listing.pricePeriod).toBe('month');
    expect(filterRentListings([listing], { selectedCategories: [], selectedLocations: [], selectedBedrooms: 'all', sortOption: 'relevance', minPrice: 0, maxPrice: 206000 })).toHaveLength(1);
  });
  it('uses nightly hotel rates and marks unconfigured rates instead of displaying $0', () => {
    const listing = propertyToListing({ ...property, kind: 'hotel', price: null });
    expect(listing.pricePeriod).toBe('night');
    expect(listing.priceAvailable).toBe(false);
    expect(listing.amenitiesKnown).toBe(false);
  });
});
