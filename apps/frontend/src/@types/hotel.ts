export interface HotelAmenitySummary {
  bedrooms: number;
  bathrooms: number;
  petFriendly: boolean;
}

export interface HotelOwner {
  name: string;
  avatar: string;
  id?: string;
}

export interface HotelListing extends HotelAmenitySummary {
  kind?: "apartment" | "hotel";
  priceAvailable?: boolean;
  pricePeriod?: "month" | "night";
  amenitiesKnown?: boolean;
  id: string;
  name: string;
  address: string;
  price: number;
  promoted: boolean;
  images: [string, ...string[]];
  category: 'Family' | 'Students' | 'Travelers' | 'Uncategorized';
  location: string;
  owner: HotelOwner;
  description: string;
  favorite?: boolean;
  isStub?: boolean;
}

export type HotelCategory = HotelListing['category'];
export type HotelLocation = HotelListing['location'];
