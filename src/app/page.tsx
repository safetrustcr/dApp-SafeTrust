import MetricsCard from "@/components/modules/MetricsCard";
import RecentContractsTable from "@/components/modules/RecentContractsTable";
import { FaLock, FaClock, FaBell, FaExclamationTriangle } from "react-icons/fa";

export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Smart Contract Tracking</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Add your dashboard content here */}
          <MetricsCard
            title="Total Value Locked"
            value="$45,231.89"
            description="+20.1% from last month"
            icon={<FaLock />}
          />
          <MetricsCard
            title="Active Contracts"
            value="24"
            description="3 pending execution"
            icon={<FaClock />}
          />
          <MetricsCard
            title="Contract Events"
            value="12"
            description="5 require attention"
            icon={<FaBell />}
          />
          <MetricsCard
            title="Disputes"
            value="3"
            description="1 critical review needed"
            icon={<FaExclamationTriangle />}
          />
        </div>
        <div>
          <RecentContractsTable />
        </div>
      </div>
    </div>
  );
}
