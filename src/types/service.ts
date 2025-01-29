export interface Service {
  id: string;
  title: string;
  rating: number;
  reviews: number;
  description: string;
  location: string;
  startingPrice: number;
  deliveryTime: string;
  badges: string[];
  category: string;
}

export interface FilterState {
  category: string;
  priceRange: { min: number; max: number };
  location: string;
  deliveryTime: string;
  badges: string[];
} 