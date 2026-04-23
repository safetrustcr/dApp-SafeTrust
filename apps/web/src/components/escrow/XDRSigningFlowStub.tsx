// TODO: replace with real XDRSigningFlow once merged in frontend-SafeTrust
// Source: frontend-SafeTrust/src/components/escrow/XDRSigningFlow.tsx
//
// Flow (when wired):
//   PAY -> signXDR() via Freighter -> POST /helper/send-transaction
//   -> router.push(`/hotel/${id}/escrow/${newEscrowId}`)

export function XDRSigningFlowStub() {
  return (
    <div className="border rounded-lg p-4 bg-card space-y-2">
      <h3 className="font-semibold">Wallet signing</h3>
      <p className="text-sm text-muted-foreground">
        XDR signing flow placeholder. Freighter integration will be wired in a follow-up merge.
      </p>
      <button
        type="button"
        disabled
        className="bg-orange-400 text-white font-bold px-4 py-2 rounded opacity-60 cursor-not-allowed"
        title="Wallet signing - coming soon"
      >
        Sign with wallet
      </button>
    </div>
  );
}
