// src/types/types.ts
export interface Apartment {
  id: string;
  name?: string;
  location?: string;
  price?: string | number;
  [key: string]: unknown;
}