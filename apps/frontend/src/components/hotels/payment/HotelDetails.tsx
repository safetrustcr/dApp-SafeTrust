"use client";
// apps/frontend/src/components/hotels/payment/HotelDetails.tsx
type CSSProperties = Record<string, string | number | undefined>;

type HotelDetailsProps = {
  location?: string;
  details ?: string;
  goodToKnow?: string;
  coordinates?: [number, number];
  rating?: number;
  beds?: number;
  baths?: number;
  hotelName?: string;
  description?: string;
  imageUrl?: string;
  pricePerNight?: number;
};

const styles = {
  card: {
    border: '1px solid #fed7aa', borderRadius: '1rem',
    backgroundColor: '#ffffff', overflow: 'hidden',
  } satisfies CSSProperties,
  img: { width: '100%', height: '10rem', objectFit: 'cover' as const, display: 'block' } satisfies CSSProperties,
  body: { padding: '1rem', display: 'grid', gap: '0.4rem' } satisfies CSSProperties,
  name: { margin: 0, fontWeight: 700, fontSize: '1rem', color: '#111827' } satisfies CSSProperties,
  location: { margin: 0, fontSize: '0.8rem', color: '#6b7280' } satisfies CSSProperties,
  price: { margin: 0, fontWeight: 700, color: '#f97316', fontSize: '0.95rem' } satisfies CSSProperties,
} as const;

import { Image } from "@/components/ui/image";

const FALLBACK = '/img/room1.png';

export default function HotelDetails({ hotelName = 'Hotel', location = '—', imageUrl, pricePerNight }: HotelDetailsProps) {
  return (
    <div style={styles.card}>
      <div className="relative w-full h-[10rem] overflow-hidden">
        <Image
          src={imageUrl ?? FALLBACK}
          alt={hotelName}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-cover"
        />
      </div>
      <div style={styles.body}>
        <p style={styles.name}>{hotelName}</p>
        <p style={styles.location}>{location}</p>
        {pricePerNight !== undefined && (
          <p style={styles.price}>${pricePerNight.toLocaleString('en-US')} <span style={{ fontWeight: 400, fontSize: '0.75rem', color: '#6b7280' }}>/ night</span></p>
        )}
      </div>
    </div>
  );
}
