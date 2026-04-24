// TODO: replace with real XDRSigningFlow once merged in frontend-SafeTrust
// Source: frontend-SafeTrust/src/components/escrow/XDRSigningFlow.tsx
//
// Flow (when wired):
//   PAY -> signXDR() via Freighter -> POST /helper/send-transaction
//   -> router.push(`/hotel/${id}/escrow/${newEscrowId}`)

export function XDRSigningFlowStub() {
  return (
    <div
      style={{
        border: '1px solid #fed7aa',
        borderRadius: '1rem',
        backgroundColor: '#ffffff',
        padding: '1rem',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Wallet signing</h3>
      <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9rem' }}>
        XDR signing flow placeholder. Freighter integration will be wired in a follow-up merge.
      </p>
      <button
        type="button"
        disabled
        style={{
          marginTop: '0.75rem',
          border: '1px solid #f97316',
          backgroundColor: '#f97316',
          color: '#ffffff',
          fontWeight: 700,
          padding: '0.55rem 1rem',
          borderRadius: '0.75rem',
          opacity: 0.6,
          cursor: 'not-allowed',
        }}
        title="Wallet signing - coming soon"
      >
        Sign with wallet
      </button>
    </div>
  );
}
