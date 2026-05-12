// TODO: replace with real EscrowDashboard component once merged in frontend-SafeTrust
// Source: frontend-SafeTrust/src/components/escrow/EscrowDashboard.tsx
//
// EscrowDashboard features:
//   - 4 StatCards: Total Escrows / As Approver / As Marker / As Releaser
//   - 3 EscrowCards grouped by role (approver / marker / releaser)
//   - useEscrowsBySignerQuery (TrustlessWork SDK) for live data
//   - useWallet() for connected wallet address
//   - Refresh button + auto-update every 30s
//   - Dark mode support

export default function EscrowDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Escrow Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Monitor and manage your escrows across all roles.
        </p>
      </div>

      {/* TODO: replace with <EscrowDashboard /> */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['Total Escrows', 'As Approver', 'As Marker', 'As Releaser'].map((label) => (
          <div key={label} className="rounded-lg border p-4 bg-card">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">—</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['As Guest (Approver)', 'As Hotel (Marker)', 'Platform Managed'].map((title) => (
          <div key={title} className="rounded-lg border p-6 bg-card">
            <p className="font-semibold mb-2">{title}</p>
            <p className="text-sm text-muted-foreground">Loading escrows...</p>
          </div>
        ))}
      </div>
    </div>
  );
}
