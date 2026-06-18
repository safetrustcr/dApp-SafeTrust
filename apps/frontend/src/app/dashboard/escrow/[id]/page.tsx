"use client";

import { useQuery } from "@apollo/client";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import type { CSSProperties } from "react";

import {
  GET_ESCROW_BY_ID,
  GET_ESCROW_BLOCKED_VIEW,
} from "@/graphql/queries/escrow-queries";
import { InvoiceHeader } from "@/components/escrow/InvoiceHeader";
import { ProcessStepper } from "@/components/escrow/ProcessStepper";
import {
  EscrowBlockedStatusView,
  type EscrowBlockedData,
} from "@/components/escrow/EscrowBlockedStatusView";
import { Button } from "@/components/ui/button";

// Map DB status → InvoiceHeader status type
function toInvoiceStatus(
  status: string
): "pending" | "paid" | "blocked" | "released" {
  switch (status) {
    case "funded":
      return "paid";
    case "active":
      return "blocked";
    case "completed":
      return "released";
    default:
      return "pending";
  }
}

// Map DB status → ProcessStepper step
function toStep(status: string): 1 | 2 | 3 | 4 {
  switch (status) {
    case "funded":
      return 2;
    case "active":
      return 3;
    case "completed":
      return 4;
    default:
      return 1;
  }
}

const styles = {
  page: {
    maxWidth: "72rem",
    margin: "0 auto",
    padding: "2rem 1.5rem 3rem",
    color: "#111827",
  } satisfies CSSProperties,
  grid: {
    display: "grid",
    gap: "1.5rem",
    marginTop: "1.5rem",
    alignItems: "start",
    gridTemplateColumns: "minmax(0, 2fr) minmax(18rem, 1fr)",
  } satisfies CSSProperties,
  panel: {
    border: "1px solid #fed7aa",
    borderRadius: "1rem",
    backgroundColor: "#ffffff",
    padding: "1.5rem",
  } satisfies CSSProperties,
  textarea: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: "0.75rem",
    padding: "0.75rem",
    font: "inherit",
    resize: "vertical",
    minHeight: "6rem",
    boxSizing: "border-box",
  } satisfies CSSProperties,
} as const;

// Shown for non-funded/active statuses — simple pending stub
function PendingStub() {
  return (
    <p style={{ margin: 0, color: "#6b7280", fontSize: "0.95rem" }}>
      Escrow is pending. Once funded the full status view will appear here.
    </p>
  );
}

export default function EscrowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // First fetch: get base escrow to know sender_address and status
  const {
    data: baseData,
    loading: baseLoading,
    error: baseError,
  } = useQuery(GET_ESCROW_BY_ID, {
    variables: { id },
    skip: !id,
  });

  const escrow = baseData?.escrows_by_pk;
  const isBlockedView =
    escrow?.status === "active" || escrow?.status === "funded";

  // Second fetch: only when status requires the blocked view (needs tenant lookup)
  const {
    data: blockedData,
    loading: blockedLoading,
    error: blockedError,
  } = useQuery(GET_ESCROW_BLOCKED_VIEW, {
    variables: { id, senderAddress: escrow?.sender_address ?? "" },
    skip: !id || !isBlockedView || !escrow?.sender_address,
  });

  const loading = baseLoading || (isBlockedView && blockedLoading);
  const error = baseError ?? blockedError;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !escrow) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-sm text-destructive">
          {error
            ? `Failed to load escrow — ${error.message}`
            : "Escrow not found."}
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard/escrow")}>
          Back to escrows
        </Button>
      </div>
    );
  }

  const invoiceStatus = toInvoiceStatus(escrow.status);
  const step = toStep(escrow.status);

  // Build the data shape for EscrowBlockedStatusView
  const blockedViewData: EscrowBlockedData | null =
    isBlockedView && blockedData
      ? {
          createdAt: escrow.created_at,
          amount: escrow.amount,
          senderAddress: escrow.sender_address,
          receiverAddress: escrow.receiver_address,
          tenant: blockedData.users?.[0]
            ? {
                firstName: blockedData.users[0].first_name,
                lastName: blockedData.users[0].last_name,
                email: blockedData.users[0].email,
              }
            : null,
          owner: escrow.apartment?.owner
            ? {
                firstName: escrow.apartment.owner.first_name,
                lastName: escrow.apartment.owner.last_name,
                email: escrow.apartment.owner.email,
              }
            : null,
        }
      : null;

  const invoiceNumber = escrow.engagement_id ?? escrow.contract_id ?? escrow.id;
  const paidAt = new Date(escrow.created_at).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div style={styles.page}>
      {/* Back nav */}
      <button
        type="button"
        onClick={() => router.push("/dashboard/escrow")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "none",
          border: "none",
          color: "#6b7280",
          fontSize: "0.875rem",
          cursor: "pointer",
          marginBottom: "1rem",
          padding: 0,
        }}
      >
        <ArrowLeft size={15} />
        Back to escrows
      </button>

      <InvoiceHeader
        invoiceNumber={invoiceNumber}
        status={invoiceStatus}
        paidAt={paidAt}
      />

      <div style={styles.grid}>
        {/* Main content panel */}
        <div style={styles.panel}>
          <p
            style={{
              marginTop: 0,
              marginBottom: "0.5rem",
              fontSize: "0.8rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#9ca3af",
            }}
          >
            {escrow.apartment?.name ?? "Property"}
          </p>
          <h2
            style={{ marginTop: 0, marginBottom: "1.5rem", fontSize: "1.5rem" }}
          >
            Payment batch - Escrow Status
          </h2>

          {/* Blocked / funded → real view with tenant + owner panels */}
          {isBlockedView && blockedViewData && (
            <EscrowBlockedStatusView data={blockedViewData} />
          )}

          {/* Loading the second query */}
          {isBlockedView && !blockedViewData && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading tenant info…
            </div>
          )}

          {/* Pending / other statuses */}
          {!isBlockedView && <PendingStub />}
        </div>

        {/* Sidebar */}
        <div style={{ display: "grid", gap: "1rem" }}>
          <div style={styles.panel}>
            <h3 style={{ marginTop: 0 }}>Notes</h3>
            <textarea style={styles.textarea} placeholder="Notes..." />
          </div>
          <ProcessStepper currentStep={step} />
        </div>
      </div>
    </div>
  );
}
