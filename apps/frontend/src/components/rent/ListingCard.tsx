import Link from 'next/link';
import type { PublicRentalProperty } from '@safetrust/types';
import { Image } from '@/components/ui/image';
import { routes } from '@/lib/routes';

export function ListingCard({ property }: { property: PublicRentalProperty }) {
  const address = [property.address, property.city].filter(Boolean).join(', ');

  return (
    <Link
      href={routes.listing({ kind: property.kind, id: property.id })}
      aria-label={`View ${property.name}`}
      className="group block min-w-0 overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] bg-muted">
        {property.images[0] ? (
          <Image
            src={property.images[0]}
            alt={property.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            No photo available
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-medium capitalize">
          {property.kind}
        </span>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <strong className="text-xl text-emerald-700 dark:text-emerald-400">
            {property.price === null ? 'Rate unavailable' : `$${property.price.toLocaleString()}`}
          </strong>
          {property.price !== null && (
            <span className="text-xs text-muted-foreground">
              {property.kind === 'hotel' ? 'per night' : 'per month'}
            </span>
          )}
        </div>
        <h2 className="font-semibold">{property.name}</h2>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {address || 'Location not provided'}
        </p>
      </div>
    </Link>
  );
}
