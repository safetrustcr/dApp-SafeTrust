import type { HotelListing } from '@/@types/hotel';
import type { PublicRentalProperty } from '@safetrust/types';

const PROVINCES = ['San José', 'Heredia', 'Alajuela', 'Cartago', 'Puntarenas', 'Guanacaste', 'Limón'];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function propertyToListing(property: PublicRentalProperty): HotelListing {
  const locationText = normalize(`${property.city} ${property.address}`);
  return {
    id: property.id, kind: property.kind, name: property.name, address: property.address,
    description: property.description ?? '', price: property.price ?? 0, priceAvailable: property.price !== null,
    pricePeriod: property.kind === 'hotel' ? 'night' : 'month', promoted: false,
    images: property.images.length ? property.images as [string, ...string[]] : ['/img/room1.png'],
    location: PROVINCES.find((province) => locationText.includes(normalize(province))) ?? property.city,
    category: 'Uncategorized', bedrooms: 0, bathrooms: 0, petFriendly: false, amenitiesKnown: false,
    owner: { name: '', avatar: '', id: property.ownerId },
  };
}
