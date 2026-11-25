"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/components/auth/hooks/auth.hook";
import { Button } from "@/components/ui/button";
import { PropertySummaryHeader } from "@/components/dashboard/apartments/PropertySummaryHeader";
import {
  InterestedPeopleTable,
  type OfferStatusFilter,
  type RentalOffer,
} from "@/components/dashboard/apartments/InterestedPeopleTable";
import {
  acceptBid,
  getApartmentBids,
  rejectBid,
  type BidApartmentSummary,
  type HostBidOffer,
} from "@/lib/api/bids";
import { ApiClientError } from "@/lib/api/client";

const PAGE_SIZE = 10;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatApartmentAddress(address: BidApartmentSummary["address"]): string {
  if (!address) return "—";
  return (
    [address.street, address.neighborhood, address.city, address.country]
      .filter(Boolean)
      .join(", ") || "—"
  );
}

export default function InterestedPeoplePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();

  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const apartmentId = typeof rawId === "string" ? rawId.trim() : "";
  const isValidId = UUID_REGEX.test(apartmentId);

  const [statusFilter, setStatusFilter] = useState<OfferStatusFilter>("ALL");
  const [page, setPage] = useState(0);
  const [apartment, setApartment] = useState<BidApartmentSummary | null>(null);
  const [offers, setOffers] = useState<HostBidOffer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actingOfferId, setActingOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (!isValidId) {
      router.push("/dashboard/apartments");
    }
  }, [isValidId, router]);

  const loadOffers = useCallback(async () => {
    if (!isValidId || authLoading) return;
    if (!user) {
      setIsLoading(false);
      setErrorMessage("Sign in as the apartment host to view offers.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await getApartmentBids(apartmentId, {
        status: statusFilter,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setApartment(response.apartment);
      setOffers(response.offers);
      setTotalCount(response.totalCount);
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Error loading offers. Please try again later.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }, [apartmentId, authLoading, isValidId, page, statusFilter, user]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const handleStatusFilterChange = (nextStatus: OfferStatusFilter) => {
    setStatusFilter(nextStatus);
    setPage(0);
  };

  const handleAccept = async (offerId: string) => {
    setActingOfferId(offerId);
    try {
      await acceptBid(offerId);
      toast.success("Offer accepted");
      await loadOffers();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "Failed to accept offer",
      );
    } finally {
      setActingOfferId(null);
    }
  };

  const handleReject = async (offerId: string) => {
    setActingOfferId(offerId);
    try {
      await rejectBid(offerId);
      toast.success("Offer rejected");
      await loadOffers();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "Failed to reject offer",
      );
    } finally {
      setActingOfferId(null);
    }
  };

  if (!isValidId) {
    return null;
  }

  if ((authLoading || isLoading) && !apartment) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (errorMessage && !apartment) {
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
          <p className="text-destructive">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!apartment) {
    return null;
  }

  const mappedOffers: RentalOffer[] = offers.map((offer) => ({
    id: offer.id,
    tenant_name: offer.tenant_name,
    tenant_phone: offer.tenant_phone,
    tenant_wallet_address: offer.tenant_wallet_address,
    proposed_price: offer.proposed_price,
    desired_move_in: offer.desired_move_in,
    offer_date: offer.created_at,
    bid_status: offer.current_status,
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
        address={formatApartmentAddress(apartment.address)}
        price={Number(apartment.price)}
      />

      {errorMessage && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      <InterestedPeopleTable
        offers={mappedOffers}
        totalCount={totalCount}
        isLoading={isLoading}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onAccept={handleAccept}
        onReject={handleReject}
        actingOfferId={actingOfferId}
      />
    </div>
  );
}
