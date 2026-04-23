// TODO: replace PAY button with real XDRSigningFlow once merged in frontend-SafeTrust
// Sources:
//   frontend-SafeTrust/src/components/escrow/XDRSigningFlow.tsx
//   frontend-SafeTrust/src/components/escrow/ProcessStepper.tsx
//   frontend-SafeTrust/src/components/escrow/InvoiceHeader.tsx
//
// Flow (when wired):
//   PAY -> signXDR() via Freighter -> POST /helper/send-transaction
//   -> router.push(`/hotel/${id}/escrow/${newEscrowId}`)

import { InvoiceHeader } from '@/components/escrow/InvoiceHeader';
import { ProcessStepper } from '@/components/escrow/ProcessStepper';
import { XDRSigningFlowStub } from '@/components/escrow/XDRSigningFlowStub';

export default function EscrowCreatePage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <InvoiceHeader invoiceNumber="INV4257-09-012" status="pending" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 border rounded-lg p-6 bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Hotel {params.id}</p>
              <h2 className="text-xl font-bold">La sabana</h2>
            </div>
            <button
              disabled
              className="bg-orange-400 text-white font-bold px-6 py-2 rounded opacity-60 cursor-not-allowed"
              title="Wallet signing - coming soon"
            >
              PAY
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>

          <p className="text-sm text-muted-foreground">Address: 329 Calle santos, paseo colon, San Jose</p>
          <div className="flex gap-4 text-sm">
            <span>2 bd</span>
            <span>pet friendly</span>
            <span>1 ba</span>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Property details</h3>
            <p className="text-sm text-muted-foreground">
              Beautiful apartment in the heart of San Jose.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Owner contact</h3>
            <p className="text-sm">Phone: +506 64852179</p>
            <p className="text-sm">Email: albertoCasas100@gmail.com</p>
          </div>

          <XDRSigningFlowStub />
        </div>

        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-card">
            <h3 className="font-semibold mb-2">Notes</h3>
            <textarea
              className="w-full text-sm border rounded p-2 h-24 resize-none"
              placeholder="Add notes..."
            />
          </div>
          <ProcessStepper currentStep={1} />
        </div>
      </div>
    </div>
  );
}
