export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Add your dashboard content here */}
          <div className="rounded-xl border bg-card p-6">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Total Deposits
              </p>
              <p className="text-2xl font-bold">$45,231.89</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Active Contracts
              </p>
              <p className="text-2xl font-bold">24</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Pending Verifications
              </p>
              <p className="text-2xl font-bold">12</p>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <div className="flex flex-col space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Open Disputes
              </p>
              <p className="text-2xl font-bold">3</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
