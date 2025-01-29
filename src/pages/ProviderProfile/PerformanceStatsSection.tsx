import { Card } from "@/components/ui/card";
import { CheckCircle2, Clock, AlertCircle, TrendingUp } from "lucide-react";

interface Stat {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  color: string;
}

export function PerformanceStats() {
  const stats: Stat[] = [
    {
      icon: CheckCircle2,
      label: "Completed Projects",
      value: "234",
      color: "text-green-500",
    },
    {
      icon: TrendingUp,
      label: "Success Rate",
      value: "98%",
      color: "text-yellow-500",
    },
    {
      icon: Clock,
      label: "Response Time",
      value: "2h avg",
      color: "text-blue-500",
    },
    {
      icon: AlertCircle,
      label: "Active Disputes",
      value: "0",
      color: "text-red-500",
    },
  ];

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Performance Stats</h2>
      <div className="space-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <span className="font-medium">{stat.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
