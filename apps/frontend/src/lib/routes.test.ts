import { describe, expect, it } from 'vitest';
import { routes, safeNextPath } from './routes';

describe('routes', () => {
  it('builds canonical public listing and booking paths', () => {
    expect(routes.listing({ kind: 'apartment', id: 'apartment-uuid' })).toBe(
      '/apartment/apartment-uuid',
    );
    expect(routes.bookHotel('hotel-uuid')).toBe('/hotel/hotel-uuid/escrow/create');
  });

  it('serializes query parameters only when present', () => {
    expect(routes.rent()).toBe('/rent');
    expect(routes.rent(new URLSearchParams({ location: 'San José' }))).toBe(
      '/rent?location=San+Jos%C3%A9',
    );
    expect(routes.suggestions(new URLSearchParams({ selected: 'listing-uuid' }))).toBe(
      '/dashboard/guest/suggestions?selected=listing-uuid',
    );
  });

  it('allows only local post-login destinations', () => {
    expect(safeNextPath('/apartment/listing')).toBe('/apartment/listing');
    expect(safeNextPath('//example.com')).toBe('/dashboard');
    expect(safeNextPath(undefined)).toBe('/dashboard');
  });
});
