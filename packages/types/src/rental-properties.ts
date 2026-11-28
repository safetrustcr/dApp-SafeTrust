export type PropertyKind = 'apartment' | 'hotel';
export type PropertyFilter = PropertyKind | 'both';
export interface PublicRentalProperty {
  id: string;
  kind: PropertyKind;
  name: string;
  description: string | null;
  address: string;
  city: string;
  price: number | null;
  images: string[];
  ownerId?: string;
  rooms?: Array<{ id: string; number: string; price: number; capacity: number; available: boolean; images: string[] }>;
}
