"use client";

import { useQuery } from "@apollo/client";
import { Loader2, ShieldCheck, Home, WalletCards, LockKeyhole, CheckCircle2, MapPin } from "lucide-react";

import { Image } from "@/components/ui/image";
import Link from "next/link";

import { EscrowPayFlow } from "@/components/escrow/EscrowPayFlow";
import { useHotelEscrowResource } from "@/hooks/use-hotel-escrow-resource";
import { GET_APARTMENT_BY_ID } from "@/graphql/queries/apartment-queries";

export type BookingSubject =
  | { kind: "apartment"; id: string }
  | { kind: "hotel-room"; id: string };

type ApartmentResult = {
  apartments: Array<{
    id: string;
    name: string;
    price: number;
    description?: string | null;
    image_urls?: string[] | null;
    address?: { street?: string; neighborhood?: string; city?: string } | null;
    warranty_deposit?: number | null;
    owner: { user_wallets: Array<{ wallet_address: string }> } | null;
  }>;
};

/** Single, trusted entry point for a guest beginning a booking escrow. */
export function BookingEscrowOrchestrator({ subject }: { subject: BookingSubject }) {
  const isApartment = subject.kind === "apartment";
  const apartmentQuery = useQuery<ApartmentResult>(GET_APARTMENT_BY_ID, {
    variables: { id: subject.id },
    skip: !isApartment,
  });

  const hotelQuery = useHotelEscrowResource<{ booking: ApartmentResult["apartments"][number]; senderAddress: string; checkIn: string; checkOut: string }>(
    isApartment ? null : `/api/escrow/hotel-reservations/${encodeURIComponent(subject.id)}`,
  );
  const { loading, error } = isApartment ? apartmentQuery : hotelQuery;
  const apartment = isApartment ? apartmentQuery.data?.apartments[0] : hotelQuery.data?.booking;

  if (loading) return <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading booking details…</div>;

  if (error || !apartment) {
    return (
      <section className="mx-auto max-w-2xl rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <h1 className="font-semibold">This listing is unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error?.message || "Refresh the listing and try again. No escrow has been created."}</p>
      </section>
    );
  }

  const ownerAddress = apartment.owner?.user_wallets[0]?.wallet_address ?? "";
  const depositAmount = Number(apartment.warranty_deposit ?? apartment.price);

  const steps = [
    { title: "Escrow deployed", description: "Sign and submit the deployment transaction on Stellar Testnet.", icon: Home },
    { title: "Deposit paid", description: "Fund the deployed escrow with your booking deposit.", icon: WalletCards },
    { title: "Deposit blocked", description: "Funds remain held while the agreement is in progress.", icon: LockKeyhole },
    { title: "Deposit released", description: "The authorized release sends funds to the recipient.", icon: CheckCircle2 },
  ];

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <Link href={isApartment ? `/apartment/${apartment.id}` : "/dashboard/hotel"} className="text-sm text-muted-foreground hover:text-foreground">← Back to listing</Link>
      <header className="flex flex-wrap items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-emerald-600" />
        <h1 className="text-2xl font-bold">Secure booking deposit</h1>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">Awaiting deployment</span>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <article className="overflow-hidden rounded-2xl border border-orange-200 bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b p-6">
            <div><h2 className="text-xl font-bold">{apartment.name}</h2><p className="mt-1 text-sm text-muted-foreground">Stellar Testnet · USDC</p>{!isApartment && hotelQuery.data && <p className="mt-1 text-sm text-muted-foreground">{new Date(hotelQuery.data.checkIn).toLocaleDateString()} – {new Date(hotelQuery.data.checkOut).toLocaleDateString()}</p>}</div>
            <EscrowPayFlow apartmentId={apartment.id} apartmentName={apartment.name} bookingKind={subject.kind} expectedSenderAddress={hotelQuery.data?.senderAddress} ownerAddress={ownerAddress} amount={depositAmount} />
          </div>
          {!ownerAddress && <p role="status" className="m-5 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">The owner must link a Stellar wallet before this deposit can be deployed.</p>}
          {!!apartment.image_urls?.length && <div className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-4">{apartment.image_urls.slice(0, 4).map((src, index) => <div key={index} className="relative aspect-[4/3] overflow-hidden rounded-lg"><Image src={src} alt={`${apartment.name} photo ${index + 1}`} fill sizes="200px" className="object-cover" /></div>)}</div>}
          <div className="space-y-4 px-6 pb-6">
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4 text-orange-500" />{[apartment.address?.street, apartment.address?.neighborhood, apartment.address?.city].filter(Boolean).join(", ")}</p>
            <div><h3 className="font-semibold">Property details</h3><p className="mt-2 text-sm text-muted-foreground">{apartment.description || "Review this apartment before creating your booking escrow."}</p></div>
            <p className="text-sm text-muted-foreground">Connect your Stellar wallet, review the deposit, then sign the deployment. Funding is a separate transaction after the escrow is confirmed.</p>
          </div>
          <dl className="flex flex-wrap items-center justify-between gap-3 border-t border-orange-200 bg-orange-50 px-6 py-5 text-orange-800"><dt>{isApartment ? "Security deposit due" : "Reservation payment due"}</dt><dd className="text-xl font-bold">${depositAmount.toLocaleString()} <span className="text-sm font-normal">USDC</span></dd></dl>
        </article>
        <aside className="rounded-2xl border border-orange-200 bg-card p-6">
          <h2 className="mb-5 font-semibold">Process</h2>
          <ol className="space-y-6">{steps.map(({ title, description, icon: Icon }, index) => <li key={title} className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span><div><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>{index === 0 && <p className="mt-1 text-xs text-orange-600">Awaiting your signature</p>}</div></li>)}</ol>
        </aside>
      </div>
    </section>
  );
}
