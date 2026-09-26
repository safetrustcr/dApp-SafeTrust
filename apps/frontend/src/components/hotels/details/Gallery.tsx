"use client";
// apps/frontend/src/components/hotels/details/Gallery.tsx
import type { CSSProperties } from 'react';

type GalleryProps = {
  images: string[];
};

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '0.5rem',
    borderRadius: '1rem',
    overflow: 'hidden',
  } satisfies CSSProperties,
  img: {
    width: '100%',
    aspectRatio: '4/3',
    objectFit: 'cover' as const,
    display: 'block',
  } satisfies CSSProperties,
  empty: {
    height: '12rem',
    backgroundColor: '#f3f4f6',
    borderRadius: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: '0.875rem',
  } satisfies CSSProperties,
} as const;

import { Image } from "@/components/ui/image";

const FALLBACK = '/img/room1.png';

/**
 * Gallery — horizontal image strip for hotel detail pages.
 */
export default function Gallery({ images }: GalleryProps) {
  if (!images.length) {
    return <div style={styles.empty}>No photos available</div>;
  }

  const shown = images.slice(0, 4);

  return (
    <div style={styles.grid}>
      {shown.map((src, i) => (
        <div key={i} className="relative aspect-[4/3] w-full overflow-hidden">
          <Image
            src={src || FALLBACK}
            alt={`Hotel photo ${i + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
            priority={i === 0}
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}