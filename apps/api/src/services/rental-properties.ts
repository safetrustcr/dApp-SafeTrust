import type { PropertyFilter, PublicRentalProperty } from '@safetrust/types';
import { hasuraRequest } from './hasura.js';

type Apartment = { id: string; name: string; description: string | null; price: string | number; image_urls: string[] | null; address: { street?: string; neighborhood?: string; city?: string } | null; owner_id: string };
type Hotel = { id: string; name: string; description: string | null; address: string; location_area: string | null; images: Array<{ image_url: string }>; rooms: Array<{ room_id: string; room_number: string; price_night: number | string; capacity: number; is_available: boolean; images: Array<{ image_url: string }> }> };

/** Public listing projection: no guest reservations, contacts, wallets, or staff data. */
export async function getRentalProperties(kind: PropertyFilter, limit = 50, offset = 0): Promise<PublicRentalProperty[]> {
  const data = await hasuraRequest<{ apartments?: Apartment[]; hotels?: Hotel[] }>(
    `query PublicRentalProperties($apartments: Boolean!, $hotels: Boolean!, $limit: Int!, $offset: Int!) {
      apartments(limit: $limit, offset: $offset, order_by: { created_at: desc }, where: { deleted_at: { _is_null: true }, is_available: { _eq: true } }) @include(if: $apartments) {
        id name description price image_urls address owner_id
      }
      hotels(limit: $limit, offset: $offset, order_by: { created_at: desc }) @include(if: $hotels) {
        id name description address location_area
        images(order_by: { position: asc }) { image_url }
        rooms(order_by: { room_number: asc }) { room_id room_number price_night capacity is_available images { image_url } }
      }
    }`, { apartments: kind !== 'hotel', hotels: kind !== 'apartment', limit, offset },
  );
  const apartments: PublicRentalProperty[] = (data.apartments ?? []).map((apartment) => ({
    id: apartment.id, kind: 'apartment', name: apartment.name, description: apartment.description,
    address: [apartment.address?.street, apartment.address?.neighborhood, apartment.address?.city].filter(Boolean).join(', '),
    city: apartment.address?.city ?? '', price: Number(apartment.price), images: apartment.image_urls ?? [], ownerId: apartment.owner_id,
  }));
  const hotels: PublicRentalProperty[] = (data.hotels ?? []).map((hotel) => {
    const rooms = hotel.rooms.map((room) => ({ id: room.room_id, number: room.room_number, price: Number(room.price_night), capacity: room.capacity, available: room.is_available, images: room.images.map((image) => image.image_url) }));
    const prices = rooms.filter((room) => room.available).map((room) => room.price);
    return { id: hotel.id, kind: 'hotel', name: hotel.name, description: hotel.description, address: hotel.address, city: hotel.location_area ?? '', price: prices.length ? Math.min(...prices) : null, images: hotel.images.map((image) => image.image_url), rooms };
  });
  return [...apartments, ...hotels];
}
