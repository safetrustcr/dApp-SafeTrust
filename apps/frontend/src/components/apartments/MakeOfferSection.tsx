"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBid, getMyBids, type BidRequest } from "@/lib/api/bids";
import { ApiClientError } from "@/lib/api/client";

type MakeOfferSectionProps = {
  apartmentId: string;
  defaultPrice: number;
  isOwner: boolean;
  isAuthenticated: boolean;
  authLoading: boolean;
};

function defaultMoveInDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

export function MakeOfferSection({
  apartmentId,
  defaultPrice,
  isOwner,
  isAuthenticated,
  authLoading,
}: MakeOfferSectionProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [proposedPrice, setProposedPrice] = useState(String(defaultPrice));
  const [desiredMoveIn, setDesiredMoveIn] = useState(defaultMoveInDate);
  const [submitting, setSubmitting] = useState(false);
  const [existingBid, setExistingBid] = useState<BidRequest | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setProposedPrice(String(defaultPrice));
  }, [defaultPrice]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || isOwner) return;

    let cancelled = false;
    getMyBids({ apartmentId, limit: 1 })
      .then((res) => {
        if (!cancelled) {
          setExistingBid(res.bids[0] ?? null);
        }
      })
      .catch(() => {
        // Non-blocking: guest can still open the offer form
      });

    return () => {
      cancelled = true;
    };
  }, [apartmentId, authLoading, isAuthenticated, isOwner]);

  if (isOwner) {
    return null;
  }

  const handleOpen = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.href)}`);
      return;
    }
    setFormError(null);
    setIsOpen((prev) => !prev);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const numericPrice = Number(proposedPrice);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setFormError("Please enter a valid offer amount greater than 0.");
      return;
    }
    if (!desiredMoveIn || Number.isNaN(Date.parse(desiredMoveIn))) {
      setFormError("Please select a valid move-in date.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const { bid } = await createBid({
        apartmentId,
        proposedPrice: numericPrice,
        desiredMoveIn: new Date(`${desiredMoveIn}T00:00:00.000Z`).toISOString(),
      });
      setExistingBid(bid);
      setIsOpen(false);
      toast.success("Offer submitted");
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Failed to submit offer. Please try again.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveBid =
    existingBid &&
    (existingBid.current_status === "PENDING" ||
      existingBid.current_status === "VIEWED" ||
      existingBid.current_status === "APPROVED");

  return (
    <div style={{ marginTop: "1rem", marginBottom: "1.5rem" }}>
      {existingBid?.current_status === "APPROVED" && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            padding: "0.9rem 1.1rem",
            borderRadius: "0.75rem",
            backgroundColor: "#dcfce7",
            border: "1px solid #86efac",
            color: "#166534",
            marginBottom: "0.75rem",
          }}
        >
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
            Your offer of ${Number(existingBid.proposed_price).toLocaleString("en-US")} was accepted!
          </span>
          <Link
            href={`/escrow/${apartmentId}/escrow/create`}
            style={{
              backgroundColor: "#166534",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.85rem",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              textDecoration: "none",
            }}
          >
            Start escrow
          </Link>
        </div>
      )}

      {existingBid &&
        (existingBid.current_status === "PENDING" || existingBid.current_status === "VIEWED") && (
          <div
            style={{
              padding: "0.85rem 1.1rem",
              borderRadius: "0.75rem",
              backgroundColor: "#fef9c3",
              border: "1px solid #fde047",
              color: "#854d0e",
              fontSize: "0.9rem",
              fontWeight: 500,
              marginBottom: "0.75rem",
            }}
          >
            Your offer of ${Number(existingBid.proposed_price).toLocaleString("en-US")} is{" "}
            <strong>{existingBid.current_status.toLowerCase()}</strong>.
          </div>
        )}

      {!hasActiveBid && (
        <button
          type="button"
          onClick={handleOpen}
          disabled={authLoading}
          style={{
            backgroundColor: "#ffffff",
            color: "#ea580c",
            fontWeight: 700,
            padding: "0.65rem 1.25rem",
            borderRadius: "0.75rem",
            border: "2px solid #f97316",
            cursor: authLoading ? "not-allowed" : "pointer",
          }}
        >
          {isOpen ? "Cancel offer" : "Make an offer"}
        </button>
      )}

      {isOpen && !hasActiveBid && (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: "0.75rem",
            padding: "1rem 1.25rem",
            borderRadius: "0.75rem",
            border: "1px solid #fed7aa",
            backgroundColor: "#ffffff",
            display: "grid",
            gap: "0.75rem",
            maxWidth: "28rem",
          }}
        >
          <div>
            <label
              htmlFor="offer-proposed-price"
              style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.25rem" }}
            >
              Proposed monthly price (USD)
            </label>
            <input
              id="offer-proposed-price"
              type="number"
              min="1"
              step="0.01"
              required
              value={proposedPrice}
              onChange={(e) => setProposedPrice(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="offer-move-in"
              style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.25rem" }}
            >
              Desired move-in date
            </label>
            <input
              id="offer-move-in"
              type="date"
              required
              value={desiredMoveIn}
              onChange={(e) => setDesiredMoveIn(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                border: "1px solid #d1d5db",
              }}
            />
          </div>

          {formError && (
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#b91c1c" }}>{formError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              backgroundColor: "#f97316",
              color: "#ffffff",
              fontWeight: 700,
              padding: "0.65rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Submitting…" : "Submit offer"}
          </button>
        </form>
      )}
    </div>
  );
}
