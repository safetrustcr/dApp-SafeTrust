import type { PropertyFilter, PublicRentalProperty } from '@safetrust/types';
import { API_BASE_URL } from './client';

export interface PublicListingsPage {
  properties: PublicRentalProperty[];
  hasMore: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPublicRentalProperty(value: unknown): value is PublicRentalProperty {
  if (!isRecord(value)) return false;
  const validRooms =
    value.rooms === undefined ||
    (Array.isArray(value.rooms) &&
      value.rooms.every(
        (room) =>
          isRecord(room) &&
          typeof room.id === 'string' &&
          typeof room.number === 'string' &&
          typeof room.price === 'number' &&
          typeof room.capacity === 'number' &&
          typeof room.available === 'boolean' &&
          Array.isArray(room.images) &&
          room.images.every((image) => typeof image === 'string'),
      ));
  return (
    typeof value.id === 'string' &&
    (value.kind === 'apartment' || value.kind === 'hotel') &&
    typeof value.name === 'string' &&
    (typeof value.description === 'string' || value.description === null) &&
    typeof value.address === 'string' &&
    typeof value.city === 'string' &&
    (typeof value.price === 'number' || value.price === null) &&
    Array.isArray(value.images) &&
    value.images.every((image) => typeof image === 'string') &&
    (value.ownerId === undefined || typeof value.ownerId === 'string') &&
    validRooms
  );
}

const HOTEL_PAGE_SIZE = 100;

/**
 * Loads a single public hotel with its rooms from the listings endpoint.
 *
 * The listings endpoint has no lookup by ID, so every page is requested while
 * `hasMore` is true until the hotel is found or the catalog is exhausted.
 */
export async function fetchPublicHotel(
  hotelId: string,
  signal: AbortSignal = new AbortController().signal,
): Promise<PublicRentalProperty> {
  let offset = 0;
  for (;;) {
    const page = await fetchPublicListings('hotel', HOTEL_PAGE_SIZE, offset, signal);
    const hotel = page.properties.find(
      (property) => property.kind === 'hotel' && property.id === hotelId,
    );
    if (hotel) return hotel;
    if (!page.hasMore || page.properties.length === 0) break;
    offset += page.properties.length;
  }
  throw new Error('This hotel is no longer available. Pick another hotel from search.');
}

export async function fetchPublicListings(
  kind: PropertyFilter,
  limit: number,
  offset: number,
  signal: AbortSignal,
): Promise<PublicListingsPage> {
  const query = new URLSearchParams({
    kind,
    limit: String(limit),
    offset: String(offset),
  });
  const response = await fetch(`${API_BASE_URL}/api/listings?${query}`, {
    signal,
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Unable to load registered properties. Check that both tenants are ready.');
  }

  const data: unknown = await response.json();
  if (
    typeof data !== 'object' ||
    data === null ||
    !('properties' in data) ||
    !Array.isArray(data.properties) ||
    !('hasMore' in data) ||
    typeof data.hasMore !== 'boolean'
  ) {
    throw new Error('The SafeTrust API returned an invalid listings response.');
  }
  const properties: PublicRentalProperty[] = [];
  for (const property of data.properties) {
    if (!isPublicRentalProperty(property)) {
      throw new Error('The SafeTrust API returned an invalid listing.');
    }
    properties.push(property);
  }
  return { properties, hasMore: data.hasMore };
}