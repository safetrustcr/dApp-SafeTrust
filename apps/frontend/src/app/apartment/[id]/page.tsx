'use client';

import Link from 'next/link';
import { useQuery } from '@apollo/client';
import { useAuthUser } from '@/components/auth/hooks/auth.hook';
import { MessageHostButton } from '@/app/apartment/[id]/MessageHostButton';
import { Image } from '@/components/ui/image';
import { GET_APARTMENT_BY_ID } from '@/graphql/queries/apartment-queries';
import { routes } from '@/lib/routes';
import { useParams } from 'next/navigation';

interface ApartmentDetailRecord {
  id: string;
  name: string;
  description: string | null;
  image_urls: string[] | null;
  address: { street?: string; neighborhood?: string; city?: string; country?: string } | null;
  price: number | string | null;
  warranty_deposit: number | string | null;
  owner_id: string;
  coordinates: unknown;
  owner?: { first_name?: string | null; last_name?: string | null } | null;
}

interface ApartmentDetailResult {
  apartments: ApartmentDetailRecord[];
}

function parseCoordinates(value: unknown): { latitude: number; longitude: number } | null {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      const match = parsed.match(/(?:POINT\s*)?\(?\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*\)?/i);
      if (!match) return null;
      const longitude = Number(match[1]);
      const latitude = Number(match[2]);
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
    }
  }
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'coordinates' in parsed &&
    Array.isArray(parsed.coordinates) &&
    parsed.coordinates.length >= 2
  ) {
    const longitude = Number(parsed.coordinates[0]);
    const latitude = Number(parsed.coordinates[1]);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  }
  return null;
}

function DetailSkeleton() {
  return (
    <main role="status" aria-label="Loading listing" className="mx-auto max-w-6xl animate-pulse space-y-6 px-5 py-8">
      <div className="h-8 w-32 rounded bg-muted" />
      <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
        <div className="min-h-72 rounded-2xl bg-muted" />
        <div className="grid gap-3"><div className="min-h-36 rounded-2xl bg-muted" /><div className="min-h-36 rounded-2xl bg-muted" /></div>
      </div>
      <div className="h-8 w-1/2 rounded bg-muted" />
      <div className="h-24 rounded bg-muted" />
    </main>
  );
}

export default function ApartmentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data, loading, error } = useQuery<ApartmentDetailResult>(GET_APARTMENT_BY_ID, {
    variables: { id },
    fetchPolicy: 'network-only',
  });
  const { user, loading: authLoading } = useAuthUser();
  const apartment = data?.apartments[0];

  if (loading) return <DetailSkeleton />;
  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16 text-center">
        <p role="alert">We couldn&apos;t load stays. Try again.</p>
      </main>
    );
  }
  if (!apartment) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16 text-center">
        <h1 className="text-2xl font-bold">Stay not found</h1>
        <p className="mt-2 text-muted-foreground">This listing may have been removed or is no longer available.</p>
        <Link href={routes.rent()} className="mt-5 inline-block font-semibold text-orange-700 underline dark:text-orange-300">
          Browse stays
        </Link>
      </main>
    );
  }

  const imageUrls = apartment.image_urls?.filter(Boolean) ?? [];
  const address = [
    apartment.address?.street,
    apartment.address?.neighborhood,
    apartment.address?.city,
    apartment.address?.country,
  ].filter(Boolean).join(', ');
  const hostName = [apartment.owner?.first_name, apartment.owner?.last_name].filter(Boolean).join(' ');
  const coordinates = parseCoordinates(apartment.coordinates);
  const mapUrl = coordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coordinates.longitude - 0.01}%2C${coordinates.latitude - 0.01}%2C${coordinates.longitude + 0.01}%2C${coordinates.latitude + 0.01}&layer=mapnik&marker=${coordinates.latitude}%2C${coordinates.longitude}`
    : undefined;
  const bookHref = authLoading || user
    ? routes.bookApartment(apartment.id)
    : routes.login(routes.bookApartment(apartment.id));

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
          <Link href={routes.rent()} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            ← Back to stays
          </Link>
          <Link href={routes.home()} className="text-xl font-bold">SafeTrust</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-8 px-5 py-8">
        <section aria-label="Listing photos" className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="relative min-h-64 overflow-hidden rounded-2xl bg-muted md:min-h-[28rem]">
            {imageUrls[0] ? <Image src={imageUrls[0]} alt={apartment.name} fill priority sizes="(max-width: 768px) 100vw, 66vw" className="object-cover" /> : <div className="grid h-full place-items-center text-muted-foreground">No photos available</div>}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-1">
            {imageUrls.slice(1, 3).map((image, index) => (
              <div key={`${image}-${index}`} className="relative min-h-32 overflow-hidden rounded-2xl bg-muted md:min-h-0">
                <Image src={image} alt={`${apartment.name} photo ${index + 2}`} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="min-w-0 space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-300">Apartment</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{apartment.name}</h1>
              {address && <p className="mt-3 text-muted-foreground">{address}</p>}
            </div>
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold">About this stay</h2>
              <p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">
                {apartment.description || 'No description provided.'}
              </p>
            </div>
            {coordinates && mapUrl && (
              <section className="border-t pt-6">
                <h2 className="mb-4 text-xl font-semibold">Location</h2>
                <iframe title={`Map showing ${apartment.name}`} src={mapUrl} className="h-72 w-full rounded-xl border" loading="lazy" />
              </section>
            )}
          </section>

          <aside className="h-fit rounded-2xl border bg-card p-5 shadow-sm">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {apartment.price === null ? 'Price unavailable' : `$${Number(apartment.price).toLocaleString()} per month`}
            </p>
            {apartment.warranty_deposit !== null && (
              <p className="mt-2 text-sm text-muted-foreground">
                Deposit: ${Number(apartment.warranty_deposit).toLocaleString()}
              </p>
            )}
            <Link href={bookHref} className="mt-5 block rounded-xl bg-orange-600 px-5 py-3 text-center font-semibold text-white hover:bg-orange-700">
              Book
            </Link>
            <MessageHostButton apartmentId={apartment.id} hostId={apartment.owner_id} />
            <div className="mt-6 border-t pt-5">
              <p className="text-sm text-muted-foreground">Hosted by</p>
              <p className="mt-1 font-semibold">{hostName || 'Host'}</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
