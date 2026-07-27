"use client";

import { Bath, BedDouble, MapPin, PawPrint } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

const FALLBACK_IMAGE = "/img/room1.png";

type ApartmentAddress = {
  street?: string;
  neighborhood?: string;
  city?: string;
};

type ApartmentPropertyCardProps = {
  name: string;
  imageUrls?: string[] | null;
  address?: ApartmentAddress | null;
  description?: string | null;
  petFriendly?: boolean;
  // TODO: wire bedrooms/bathrooms after migration
  bedrooms?: number | null;
  bathrooms?: number | null;
  paySlot?: ReactNode;
};

const styles = {
  headingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap",
  } satisfies CSSProperties,
  imageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "0.5rem",
  } satisfies CSSProperties,
  img: {
    width: "100%",
    height: "5rem",
    objectFit: "cover",
    borderRadius: "0.75rem",
    display: "block",
  } satisfies CSSProperties,
  amenityRow: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
  } satisfies CSSProperties,
  mutedText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.9rem",
  } satisfies CSSProperties,
} as const;

function formatAddress(address: ApartmentAddress | null | undefined): string {
  if (!address) return "";
  return [address.street, address.neighborhood, address.city]
    .filter(Boolean)
    .join(", ");
}

function AmenityPill({
  icon: Icon,
  label,
}: {
  icon: typeof BedDouble;
  label: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        border: "1px solid #fed7aa",
        borderRadius: "9999px",
        padding: "0.25rem 0.85rem",
        fontSize: "0.8rem",
        color: "#374151",
        backgroundColor: "#fff7ed",
      }}
    >
      <Icon size={13} color="#f97316" strokeWidth={2} />
      {label}
    </span>
  );
}

function buildImageList(imageUrls: string[] | null | undefined): string[] {
  const valid = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];
  const filled = [...valid];
  while (filled.length < 4) {
    filled.push(FALLBACK_IMAGE);
  }
  return filled.slice(0, 4);
}

export function ApartmentPropertyCard({
  name,
  imageUrls,
  address,
  description,
  petFriendly = false,
  // TODO: wire bedrooms/bathrooms after migration
  bedrooms,
  bathrooms,
  paySlot,
}: ApartmentPropertyCardProps) {
  const images = buildImageList(imageUrls);
  const addressLine = formatAddress(address);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={styles.headingRow}>
        <h2 style={{ margin: 0, fontSize: "1.5rem" }}>{name}</h2>
        {paySlot}
      </div>

      <div style={styles.imageGrid}>
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt={`${name} photo ${i + 1}`}
            style={styles.img}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.onerror = null;
              img.src = FALLBACK_IMAGE;
            }}
          />
        ))}
      </div>

      {addressLine && (
        <p
          style={{
            ...styles.mutedText,
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          <MapPin size={14} color="#f97316" />
          <span>{addressLine}</span>
        </p>
      )}

      <div style={styles.amenityRow}>
        {/* TODO: wire bedrooms after migration */}
        <AmenityPill
          icon={BedDouble}
          label={bedrooms != null ? `${bedrooms} bd` : "2 bd"}
        />
        {petFriendly && <AmenityPill icon={PawPrint} label="pet friendly" />}
        {/* TODO: wire bathrooms after migration */}
        <AmenityPill
          icon={Bath}
          label={bathrooms != null ? `${bathrooms} ba` : "1 ba"}
        />
      </div>

      {description && (
        <div>
          <h3 style={{ marginTop: 0, marginBottom: "0.35rem", fontSize: "1rem" }}>
            Property details
          </h3>
          <p style={styles.mutedText}>{description}</p>
        </div>
      )}
    </div>
  );
}
