// Apartment detail page — renders one real listing through the typed model.
//
// Data: useListing('apartment', id) → GET_APARTMENT_BY_ID → features/listings
// (see docs/frontend-migration/listing-fields.md for the field matrix).
// Fields the API doesn't have (bedrooms, bathrooms, pets, amenities,
// description…) stay hidden — never invented. The gallery shows real
// image_urls or an honest "No photos" placeholder.
//
// Message-host flow preserved from main (upstream), rewired from the stub
// owner id to the listing's real owner_id: without an owner id the button
// stays hidden — never a stub fallback.

"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { toast } from "sonner";

import { useAuthUser } from "@/components/auth/hooks/auth.hook";
import { useListing } from "@/features/listings/use-listings";
import { startConversation } from "@/lib/api/messages";

const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#fff7ed",
    color: "#111827",
  } satisfies CSSProperties,
  imageFrame: {
    borderRadius: "1rem",
    overflow: "hidden",
    backgroundColor: "#fed7aa",
  } satisfies CSSProperties,
  image: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "cover",
  } satisfies CSSProperties,
  imagePlaceholder: {
    backgroundColor: "#fed7aa",
    borderRadius: "1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9a3412",
  } satisfies CSSProperties,
  main: {
    flex: 1,
    maxWidth: "64rem",
    padding: "1.5rem",
  } satisfies CSSProperties,
  gallery: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "0.5rem",
    marginBottom: "1.5rem",
  } satisfies CSSProperties,
  thumbs: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  } satisfies CSSProperties,
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "1rem",
    marginBottom: "1rem",
  } satisfies CSSProperties,
  actions: {
    display: "flex",
    gap: "0.5rem",
  } satisfies CSSProperties,
  button: {
    display: "inline-block",
    backgroundColor: "#f97316",
    color: "#ffffff",
    fontWeight: 700,
    padding: "0.75rem 1.5rem",
    borderRadius: "0.75rem",
  } satisfies CSSProperties,
  messageButton: {
    display: "inline-block",
    backgroundColor: "#ffffff",
    color: "#f97316",
    fontWeight: 700,
    padding: "0.75rem 1.5rem",
    borderRadius: "0.75rem",
    border: "2px solid #f97316",
    cursor: "pointer",
  } satisfies CSSProperties,
  metaRow: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1rem",
    flexWrap: "wrap",
  } satisfies CSSProperties,
  statusText: {
    color: "#57534e",
    fontSize: "1rem",
    lineHeight: 1.6,
  } satisfies CSSProperties,
  errorText: {
    color: "#b91c1c",
    fontSize: "1rem",
    lineHeight: 1.6,
    marginBottom: "1rem",
  } satisfies CSSProperties,
} as const;

const PRICE_UNIT_LABEL = { month: "Per month", night: "Per night" } as const;

function formatAmount(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

export default function ApartmentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const listing = useListing("apartment", params.id);
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const [isMessaging, setIsMessaging] = useState(false);

  if (listing.status === "not_found") {
    notFound();
  }

  if (listing.status === "loading") {
    return (
      <div style={styles.page}>
        <main style={styles.main}>
          <p style={styles.statusText}>Loading listing…</p>
        </main>
      </div>
    );
  }

  if (listing.status === "error") {
    return (
      <div style={styles.page}>
        <main style={styles.main}>
          <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.5rem", fontWeight: 700 }}>
            Couldn’t load this listing
          </h1>
          <p style={styles.errorText}>
            {listing.error === "unauthorized"
              ? "You don’t have permission to view this listing."
              : "A network error occurred. Check your connection and try again."}
          </p>
          <Link href="/apartment" style={styles.button}>
            Back to listings
          </Link>
        </main>
      </div>
    );
  }

  const apartment = listing.item;
  const [mainImage, ...restImages] = apartment.images;
  const isOwner =
    user != null && apartment.ownerId != null && apartment.ownerId === user.uid;
  const canMessageHost =
    !authLoading && !isOwner && typeof apartment.ownerId === "string";

  const handleMessageHost = async () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.href)}`);
      return;
    }

    if (isOwner) {
      return;
    }

    setIsMessaging(true);

    try {
      const response = await startConversation(apartment.id);
      router.push(`/dashboard/messages/${response.conversationId}`);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      toast.error("Failed to start conversation", {
        description: "Please try again",
        action: {
          label: "Retry",
          onClick: handleMessageHost,
        },
      });
    } finally {
      setIsMessaging(false);
    }
  };

  return (
    <div style={styles.page}>
      <main style={styles.main}>
        {mainImage ? (
          <div style={styles.gallery}>
            <div style={{ ...styles.imageFrame, minHeight: "16rem" }}>
              <img
                src={mainImage}
                alt={apartment.title}
                style={{ ...styles.image, minHeight: "16rem" }}
              />
            </div>

            {restImages.length > 0 && (
              <div style={styles.thumbs}>
                {restImages.slice(0, 3).map((src) => (
                  <div key={src} style={{ ...styles.imageFrame, flex: 1, minHeight: "5rem" }}>
                    <img src={src} alt="" style={styles.image} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ ...styles.imagePlaceholder, minHeight: "16rem", marginBottom: "1.5rem" }}>
            <span style={{ fontSize: "0.75rem" }}>No photos</span>
          </div>
        )}

        <div style={styles.header}>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 700 }}>
              {apartment.title}
            </h1>

            <p
              style={{
                marginTop: "0.5rem",
                color: "#ea580c",
                fontWeight: 600,
              }}
            >
              {formatAmount(apartment.price.amount)}{" "}
              {PRICE_UNIT_LABEL[apartment.price.unit]}
            </p>
          </div>

          <div style={styles.actions}>
            <Link
              href={`/apartment/${params.id}/escrow/create`}
              style={styles.button}
            >
              BOOK
            </Link>
            {canMessageHost && (
              <button
                onClick={handleMessageHost}
                disabled={isMessaging}
                style={{
                  ...styles.messageButton,
                  opacity: isMessaging ? 0.5 : 1,
                  cursor: isMessaging ? "not-allowed" : "pointer",
                }}
              >
                {isMessaging ? "Loading..." : "Message host"}
              </button>
            )}
          </div>
        </div>

        <div
          style={{ ...styles.metaRow, color: "#57534e", fontSize: "0.95rem" }}
        >
          <span>
            📍 {apartment.addressLine}
            {apartment.province ? ` · ${apartment.province}` : ""}
          </span>
          {apartment.deposit && (
            <span>
              🔒 Deposit: {formatAmount(apartment.deposit.amount)}
            </span>
          )}
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <p style={{ marginBottom: "0.25rem", fontWeight: 600 }}>
            {apartment.hostName ? `Host: ${apartment.hostName}` : "Host"}
          </p>
        </div>
      </main>
    </div>
  );
}
