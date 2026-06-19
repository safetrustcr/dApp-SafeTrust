"use client";

import { useQuery } from "@apollo/client";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { CSSProperties } from "react";

import { InvoiceHeader } from "@/components/escrow/InvoiceHeader";
import { NotesPanel } from "@/components/escrow/NotesPanel";
import { ProcessStepper } from "@/components/escrow/ProcessStepper";
import { EscrowInvoiceView } from "@/components/escrow/views/EscrowInvoiceView";
import { EscrowPendingView } from "@/components/escrow/views/EscrowPendingView";
import { EscrowReleasedView } from "@/components/escrow/views/EscrowReleasedView";
import { EscrowStatusView } from "@/components/escrow/views/EscrowStatusView";
import { invoiceNumber } from "@/components/escrow/views/escrow-view-utils";
import { GET_ESCROW_BY_ID } from "@/graphql/queries/escrow-queries";
import type { EscrowDetail, GetEscrowByIdResult } from "@/types/escrow";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  } satisfies CSSProperties,
  panel: {
    border: "1px solid #fed7aa",
    borderRadius: "1rem",
    backgroundColor: "#ffffff",
    padding: "1.5rem",
  } satisfies CSSProperties,
  sidebar: {
    display: "grid",
    gap: "1rem",
  } satisfies CSSProperties,
  mutedText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.9rem",
  } satisfies CSSProperties,
  eyebrow: {
    marginTop: 0,
    marginBottom: "0.5rem",
    fontSize: "0.8rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9ca3af",
  } satisfies CSSProperties,
} as const;

type ViewKind = "pending" | "invoice" | "status" | "released";

type ViewMeta = {
  kind: ViewKind;
  title: string;
  headerStatus: "pending" | "paid" | "blocked" | "released";
  step: 1 | 2 | 3 | 4;
};

// Resolves the raw escrow.status (plus the local invoice-acknowledged flag)
// into the sub-view to render along with its invoice badge and stepper step.
function resolveView(status: string, invoiceAcknowledged: boolean): ViewMeta {
  switch (status.toLowerCase()) {
    case "pending_signature":
    case "deploying":
      return {
        kind: "pending",
        title: "Complete your payment",
        headerStatus: "pending",
        step: 1,
      };
    case "funded":
    case "active":
      return invoiceAcknowledged
        ? {
            kind: "status",
            title: "Escrow status",
            headerStatus: "blocked",
            step: 3,
          }
        : {
            kind: "invoice",
            title: "Payment batch",
            headerStatus: "paid",
            step: 2,
          };
    case "completed":
    case "resolved":
      return {
        kind: "released",
        title: "Deposit / Escrow released",
        headerStatus: "released",
        step: 4,
      };
    default:
      return {
        kind: "invoice",
        title: "Payment batch",
        headerStatus: "paid",
        step: 2,
      };
  }
}

function renderView(
  view: ViewMeta,
  escrow: EscrowDetail,
  onAcknowledge: () => void
) {
  switch (view.kind) {
    case "pending":
      return <EscrowPendingView escrow={escrow} />;
    case "invoice":
      return <EscrowInvoiceView escrow={escrow} onAcknowledge={onAcknowledge} />;
    case "status":
      return <EscrowStatusView escrow={escrow} />;
    case "released":
      return <EscrowReleasedView escrow={escrow} />;
  }
}

export default function EscrowDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const isValidId = UUID_RE.test(id);
  const [invoiceAcknowledged, setInvoiceAcknowledged] = useState(false);

  const { data, loading, error } = useQuery<GetEscrowByIdResult>(
    GET_ESCROW_BY_ID,
    { variables: { id }, skip: !isValidId }
  );

  const escrow = data?.escrows_by_pk ?? null;

  if (loading) {
    return (
      <div style={styles.page}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (!isValidId || error || !escrow) {
    return (
      <div style={styles.page}>
        <div style={styles.panel}>
          <h2 style={{ marginTop: 0 }}>Escrow not found</h2>
          <p style={styles.mutedText}>
            {!isValidId
              ? "This escrow id is not valid."
              : error
                ? `Failed to load escrow — ${error.message}`
                : "We couldn't find an escrow with this id."}
          </p>
        </div>
      </div>
    );
  }

  const view = resolveView(escrow.status, invoiceAcknowledged);

  return (
    <div style={styles.page}>
      <InvoiceHeader
        invoiceNumber={invoiceNumber(escrow)}
        status={view.headerStatus}
        paidAt={new Date(
          escrow.updated_at ?? escrow.created_at
        ).toLocaleDateString()}
      />

      <div
        className="grid grid-cols-1 lg:grid-cols-3"
        style={styles.grid}
      >
        <div className="lg:col-span-2" style={styles.panel}>
          <p style={styles.eyebrow}>{escrow.apartment?.name ?? "Escrow"}</p>
          <h2 style={{ marginTop: 0, marginBottom: "1.5rem", fontSize: "1.5rem" }}>
            {view.title}
          </h2>

          {renderView(view, escrow, () => setInvoiceAcknowledged(true))}
        </div>

        <div style={styles.sidebar}>
          <NotesPanel escrowId={escrow.id} />
          <ProcessStepper currentStep={view.step} />
        </div>
      </div>
    </div>
  );
}
