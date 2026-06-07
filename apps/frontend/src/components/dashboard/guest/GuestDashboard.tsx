import Image from "next/image";
import Link from "next/link";
import { Bath, BedDouble, Heart, MapPin, PawPrint } from "lucide-react";

const SUGGESTIONS = Array.from({ length: 5 }, (_, index) => ({
  id: String(index + 1),
  name: "Los yoses",
  address: "329 Calle santos, paseo colon, San Jose",
  price: 4000,
  imageSrc: index % 2 === 0 ? "/img/room1.png" : "/img/room2.png",
}));

export default function GuestDashboard() {
  return (
    <div className="grid gap-8 bg-background text-foreground xl:grid-cols-[18rem_1fr]">
      <aside className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Suggestions</h1>
          <p className="text-sm font-medium text-gray-600">
            More than 200 units available
          </p>
          <Link
            href="/dashboard/guest/suggestions"
            className="inline-flex text-xs font-medium text-orange-500 underline-offset-2 hover:text-orange-600 hover:underline"
          >
            Browse all -&gt;
          </Link>
        </div>

        <div className="space-y-3">
          {SUGGESTIONS.map((suggestion) => (
            <article
              key={suggestion.id}
              className="flex gap-3 rounded-lg border border-gray-200 bg-white p-2"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-gray-100">
                <Image
                  src={suggestion.imageSrc}
                  alt={suggestion.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold">{suggestion.name}</h2>
                    <p className="line-clamp-2 text-[11px] text-gray-500">
                      {suggestion.address}
                    </p>
                  </div>
                  <Heart className="h-4 w-4 shrink-0 text-red-400" />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-gray-500">2bd - pet friendly - 1 ba</span>
                  <span className="font-bold text-emerald-600">
                    ${suggestion.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </aside>

      <main className="grid gap-6 lg:grid-cols-[1fr_15rem]">
        <section className="space-y-6">
          <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-gray-100">
            <Image
              src="/img/hotel/hotel1.jpg"
              alt="La sabana sur"
              fill
              priority
              sizes="(min-width: 1280px) 55vw, 100vw"
              className="object-cover"
            />
            <span className="absolute bottom-4 left-4 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold uppercase text-white">
              Promoted
            </span>
          </div>

          <div className="space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <h2 className="text-3xl font-bold">La sabana sur</h2>
                <p className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="h-4 w-4 text-orange-400" />
                  329 Calle santos, paseo colon, San Jose
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <BedDouble className="h-4 w-4 text-orange-400" />2 bd
                  </span>
                  <span className="flex items-center gap-1">
                    <PawPrint className="h-4 w-4 text-orange-400" />
                    pet friendly
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4 text-orange-400" />1 ba
                  </span>
                </div>
              </div>

              <div className="space-y-3 md:text-right">
                <button
                  type="button"
                  className="rounded-lg bg-orange-500 px-10 py-3 text-sm font-bold text-white hover:bg-orange-600"
                >
                  BOOK
                </button>
                <p className="text-lg font-bold text-emerald-600">
                  $4,058.00{" "}
                  <span className="text-xs font-normal text-gray-500">
                    Per month
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold">Apartment details</h3>
              <p className="max-w-3xl text-sm leading-6 text-gray-500">
                Bright apartment near San Jose with generous living space,
                natural light, pet-friendly amenities, and quick access to
                nearby restaurants, transit, and parks.
              </p>
            </div>
          </div>
        </section>

        <aside className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          {["/img/room1.png", "/img/room2.png", "/img/hotel/hotel1.jpg"].map(
            (imageSrc) => (
              <div
                key={imageSrc}
                className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-100"
              >
                <Image
                  src={imageSrc}
                  alt="Apartment preview"
                  fill
                  sizes="(min-width: 1024px) 15rem, 33vw"
                  className="object-cover"
                />
              </div>
            )
          )}
        </aside>
      </main>
    </div>
  );
}
