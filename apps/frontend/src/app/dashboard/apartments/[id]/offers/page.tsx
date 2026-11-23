"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSuspenseQuery } from "@apollo/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PropertySummaryHeader } from "@/components/dashboard/apartments/PropertySummaryHeader";
import { InterestedPeopleTable } from "@/components/dashboard/apartments/InterestedPeopleTable";
import {
  GET_APARTMENT_BY_ID,
} from "@/graphql/queries/apartment-queries";
import {
  GET_RENTAL_OFFERS,
} from "@/graphql/queries/bid-queries";
import type { RentalOffer } from "@/components/dashboard/apartments/InterestedPeopleTable";

export default function InterestedPeoplePage() {
  const params = useParams();
  const router = useRouter();
  const apartmentId = params.id as string;

  const { data: apartmentData } = useSuspenseQuery(GET_APARTMENT_BY_ID, {
    variables: { id: apartmentId },
  });
  const { data: offersData } = useSuspenseQuery(GET_RENTAL_OFFERS, {
    variables: { apartment_id: apartmentId, order_by: [{ created_at: "desc" }] },
  });

  const apartment = apartmentData?.apartments?.[0];
  const offers = offersData?.bid_requests || [];
  const totalCount = offersData?.bid_requests_aggregate?.aggregate?.count || 0;

  const apartmentLoading = false;
  const offersLoading = false;
  const apartmentError = null;
  const offersError = null;

  // Handle invalid apartment ID
  useEffect(() => {
    if (!apartmentId) {
      router.push("/dashboard/apartments");
    }
  }, [apartmentId, router]);

  // Handle apartment not found
  useEffect(() => {
    if (!apartmentLoading && !apartment && !apartmentError) {
      router.push("/dashboard/apartments");
    }
  }, [apartment, apartmentLoading, apartmentError, router]);

  if (apartmentLoading || offersLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (apartmentError || offersError) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/apartments")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to apartments
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <p className="text-destructive">
            Error loading data. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  if (!apartment) {
    return null;
  }

  const mappedOffers: RentalOffer[] = offers.map((offer: any) => ({
    id: offer.id,
    tenant_name: offer.tenant?.name || "Unknown",
    tenant_phone: offer.tenant?.phone || "N/A",
    tenant_wallet_address: offer.tenant?.id || "N/A", // Using tenant_id as wallet address placeholder if not available
    offer_date: offer.created_at,
    bid_status: offer.current_status.toLowerCase(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/apartments")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h2 className="text-lg font-medium text-muted-foreground">
          Interested people
        </h2>
      </div>

      <PropertySummaryHeader
        name={apartment.name}
        address={apartment.address || ""}
        bedrooms={0} // TODO: Add bedrooms to apartment query/type if needed
        bathrooms={0} // TODO: Add bathrooms to apartment query/type if needed
        price={apartment.price}
      />

      <InterestedPeopleTable
        offers={mappedOffers}
        totalCount={totalCount}
        isLoading={offersLoading}
      />
    </div>
  );
}
