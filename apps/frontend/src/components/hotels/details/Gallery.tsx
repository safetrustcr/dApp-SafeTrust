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

const FALLBACK = '/img/room1.png';

/**
 * Gallery — horizontal image strip for hotel detail pages.
 * Uses a plain <img> with onerror fallback (intentional — hotel images
 * are external URLs; next/image requires domain allow-list config).
 */
/* eslint-disable @next/next/no-img-element */
export default function Gallery({ images }: GalleryProps) {
  if (!images.length) {
    return <div style={styles.empty}>No photos available</div>;
  }

  const shown = images.slice(0, 4);

  return (
    <div style={styles.grid}>
      {shown.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`Hotel photo ${i + 1}`}
          style={styles.img}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.onerror = null;
            img.src = FALLBACK;
          }}
        />
      ))}
    </div>
  );
}