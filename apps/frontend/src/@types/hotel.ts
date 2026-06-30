export interface HotelAmenitySummary {
  bedrooms: number;
  bathrooms: number;
  petFriendly: boolean;
}

export interface HotelOwner {
  name: string;
  avatar: string;
}

export interface HotelListing extends HotelAmenitySummary {
  id: string;
  name: string;
  address: string;
  price: number;
  promoted: boolean;
  images: [string, ...string[]];
  category: 'Family' | 'Students' | 'Travelers';
  location:
    | 'San José'
    | 'Heredia'
    | 'Alajuela'
    | 'Cartago'
    | 'Puntarenas'
    | 'Guanacaste'
    | 'Limón';
  owner: HotelOwner;
  description: string;
  favorite?: boolean;
}

export type HotelCategory = HotelListing['category'];
export type HotelLocation = HotelListing['location'];
